const fs = require("fs/promises");
const path = require("path");

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConflictError";
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
  }
}

class ProjectRepository {
  constructor(storageDir) {
    this.storageDir = storageDir;
    this.lock = Promise.resolve();
    this.ready = this.ensureStorage();
  }

  async ensureStorage() {
    await fs.mkdir(this.storageDir, { recursive: true });
    await this.migrateLegacyAggregatedFile();
  }

  async migrateLegacyAggregatedFile() {
    const aggregatePath = path.join(this.storageDir, "projects.json");
    const backupPath = path.join(this.storageDir, "projects.legacy.json");

    if (await this.exists(backupPath)) {
      return;
    }

    const legacyProjects = await this.readJson(aggregatePath);
    if (!Array.isArray(legacyProjects) || legacyProjects.length === 0) {
      return;
    }

    for (const legacy of legacyProjects) {
      if (!legacy?.id) continue;
      const normalized = this.normalizeProject(legacy);
      const targetFile = projectPath(this.storageDir, normalized.id);
      if (await this.exists(targetFile)) {
        continue;
      }
      await this.writeProjectFile(normalized.id, normalized);
      await this.appendLog(normalized.id, `MIGRATE from aggregated file (${path.basename(aggregatePath)})`);
    }

    try {
      await safeMove(aggregatePath, backupPath);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to move legacy aggregated file", error);
    }
  }

  async withLock(action) {
    const run = this.lock.then(async () => {
      await this.ready;
      return action();
    });
    this.lock = run.catch(() => {});
    return run;
  }

  async listProjects() {
    return this.readProjects();
  }

  async getProject(projectId) {
    const project = await this.readProjectFile(projectId);
    if (project) return this.normalizeProject(project);
    return null;
  }

  async createProject(payload) {
    return this.withLock(async () => {
      const projectFile = projectPath(this.storageDir, payload.id);
      if (await this.exists(projectFile)) {
        throw new ConflictError(`Project ${payload.id} already exists`);
      }

      const now = new Date().toISOString();
      const preparedRequirements = [];
      for (const [index, requirement] of (payload.requirements || []).entries()) {
        preparedRequirements.push(
          this.toRequirement(payload.id, requirement, index + 1, preparedRequirements),
        );
      }

      const project = {
        id: payload.id,
        name: payload.name,
        missionPhase: payload.missionPhase,
        lifecycleState: payload.lifecycleState,
        sponsor: payload.sponsor,
        summary: payload.summary,
        tags: payload.tags || [],
        functionalDecomposition: payload.functionalDecomposition || [],
        physicalDecomposition: payload.physicalDecomposition || [],
        requirements: preparedRequirements,
        bom: payload.bom || [],
        subsystems: payload.subsystems || [],
        interfaces: payload.interfaces || [],
        lastUpdated: now,
      };

      await this.writeProjectFile(project.id, project);
      await this.appendLog(project.id, `CREATE project ${project.id}`);
      return project;
    });
  }

  async replaceProject(projectId, payload) {
    return this.withLock(async () => {
      const existing = await this.readProjectFile(projectId);
      if (!existing) throw new NotFoundError(`Project ${projectId} not found`);

      const now = new Date().toISOString();
      const preparedRequirements = [];
      for (const [reqIndex, requirement] of (payload.requirements || []).entries()) {
        preparedRequirements.push(
          this.toRequirement(projectId, requirement, reqIndex + 1, preparedRequirements),
        );
      }

      const updated = {
        id: projectId,
        name: payload.name,
        missionPhase: payload.missionPhase,
        lifecycleState: payload.lifecycleState,
        sponsor: payload.sponsor,
        summary: payload.summary,
        tags: payload.tags || [],
        functionalDecomposition: payload.functionalDecomposition || [],
        physicalDecomposition: payload.physicalDecomposition || [],
        requirements: preparedRequirements,
        bom: payload.bom || [],
        subsystems: payload.subsystems || [],
        interfaces: payload.interfaces || [],
        lastUpdated: now,
      };

      await this.writeProjectFile(projectId, updated);
      await this.appendLog(projectId, `REPLACE project ${projectId}`);
      return updated;
    });
  }

  async updateProject(projectId, updates) {
    return this.withLock(async () => {
      const project = await this.readProjectFile(projectId);
      if (!project) throw new NotFoundError(`Project ${projectId} not found`);

      const updated = {
        ...project,
        ...updates,
        lastUpdated: new Date().toISOString(),
      };

      await this.writeProjectFile(projectId, updated);
      const updatedKeys = Object.keys(updates || {}).join(", ") || "no fields";
      await this.appendLog(projectId, `UPDATE project ${projectId} fields: ${updatedKeys}`);
      return updated;
    });
  }

  async deleteProject(projectId) {
    return this.withLock(async () => {
      const jsonPath = projectPath(this.storageDir, projectId);
      const logPath = logPathFor(this.storageDir, projectId);
      if (!(await this.exists(jsonPath))) throw new NotFoundError(`Project ${projectId} not found`);

      await fs.rm(jsonPath, { force: true });
      await fs.rm(logPath, { force: true });
    });
  }

  async addRequirement(projectId, payload) {
    return this.withLock(async () => {
      const project = await this.readProjectFile(projectId);
      if (!project) throw new NotFoundError(`Project ${projectId} not found`);

      const requirement = this.toRequirement(
        projectId,
        payload,
        (project.requirements || []).length + 1,
        project.requirements || [],
      );
      const updated = {
        ...project,
        requirements: [...(project.requirements || []), requirement],
        lastUpdated: new Date().toISOString(),
      };

      await this.writeProjectFile(projectId, updated);
      await this.appendLog(projectId, `ADD requirement ${requirement.id}`);
      return requirement;
    });
  }

  async updateRequirement(projectId, requirementId, updates) {
    return this.withLock(async () => {
      const project = await this.readProjectFile(projectId);
      if (!project) throw new NotFoundError(`Project ${projectId} not found`);
      const requirementIndex = (project.requirements || []).findIndex(
        (req) => req.id === requirementId,
      );
      if (requirementIndex === -1) {
        throw new NotFoundError(`Requirement ${projectId}:${requirementId} not found`);
      }

      const requirement = project.requirements[requirementIndex];
      const updatedRequirement = { ...requirement, ...updates };
      const requirements = [...project.requirements];
      requirements[requirementIndex] = updatedRequirement;
      const updatedProject = {
        ...project,
        requirements,
        lastUpdated: new Date().toISOString(),
      };

      await this.writeProjectFile(projectId, updatedProject);
      const updatedKeys = Object.keys(updates || {}).join(", ") || "no fields";
      await this.appendLog(projectId, `UPDATE requirement ${requirementId}: ${updatedKeys}`);
      return updatedRequirement;
    });
  }

  async deleteRequirement(projectId, requirementId) {
    return this.withLock(async () => {
      const project = await this.readProjectFile(projectId);
      if (!project) throw new NotFoundError(`Project ${projectId} not found`);
      const filtered = (project.requirements || []).filter((req) => req.id !== requirementId);
      if (filtered.length === (project.requirements || []).length) {
        throw new NotFoundError(`Requirement ${projectId}:${requirementId} not found`);
      }

      const updatedProject = {
        ...project,
        requirements: filtered,
        lastUpdated: new Date().toISOString(),
      };
      await this.writeProjectFile(projectId, updatedProject);
      await this.appendLog(projectId, `DELETE requirement ${requirementId}`);
    });
  }

  async readProjects() {
    await this.ready;
    try {
      const files = await fs.readdir(this.storageDir);
      const jsonFiles = files.filter((file) => {
        const lower = file.toLowerCase();
        if (!lower.endsWith(".json")) return false;
        return lower !== "projects.json" && lower !== "projects.legacy.json";
      });
      const projects = [];
      for (const file of jsonFiles) {
        const content = await this.readJson(path.join(this.storageDir, file));
        if (!content) continue;
        if (Array.isArray(content)) {
          for (const item of content) {
            if (item?.id) projects.push(this.normalizeProject(item));
          }
        } else if (content?.id) {
          projects.push(this.normalizeProject(content));
        }
      }
      return projects;
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }

  async readProjectFile(projectId) {
    await this.ready;
    const raw = await this.readJson(projectPath(this.storageDir, projectId));
    if (!raw) return null;
    if (Array.isArray(raw)) {
      return raw.find((item) => item?.id === projectId) || null;
    }
    return this.normalizeProject(raw);
  }

  async readJson(filePath) {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const sanitized = raw.replace(/^\uFEFF/, "");
      const parsed = JSON.parse(sanitized);
      return parsed;
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }

  async writeProjectFile(projectId, project) {
    const payload = JSON.stringify(this.normalizeProject(project), null, 2);
    await fs.writeFile(projectPath(this.storageDir, projectId), payload, "utf8");
  }

  async appendLog(projectId, message) {
    const logPath = logPathFor(this.storageDir, projectId);
    const line = `[${new Date().toISOString()}] ${message}\n`;
    await fs.appendFile(logPath, line, "utf8");
  }

  async readLog(projectId) {
    const logPath = logPathFor(this.storageDir, projectId);
    try {
      return await fs.readFile(logPath, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") return "";
      throw error;
    }
  }

  async exists(targetPath) {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  toRequirement(projectId, payload, indexHint, existingRequirements = []) {
    return {
      id: this.buildRequirementId(projectId, existingRequirements, indexHint),
      title: payload.title,
      statement: payload.statement,
      rationale: payload.rationale,
      verificationMethod: payload.verificationMethod,
      status: payload.status,
      owner: payload.owner,
      priority: payload.priority,
      scope: payload.scope,
    };
  }

  buildRequirementId(projectId, requirements, indexHint) {
    const prefix =
      (projectId.match(/[A-Za-z0-9]/g) || []).join("").toUpperCase().slice(0, 3) || "PRJ";
    const existingNumbers = (requirements || [])
      .map((req) => this.extractNumericSuffix(req.id))
      .filter((num) => Number.isFinite(num) && num > 0);

    let candidate = Math.max(0, ...existingNumbers) + 1;
    candidate = Math.max(candidate, indexHint);
    return `${prefix}-REQ-${String(candidate).padStart(3, "0")}`;
  }

  extractNumericSuffix(identifier) {
    if (!identifier) {
      return 0;
    }
    const parts = identifier.split("-");
    const suffix = parts[parts.length - 1];
    const parsed = Number.parseInt(suffix, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  normalizeProject(project) {
    if (!project) return project;
    return {
      id: project.id,
      name: project.name,
      missionPhase: project.missionPhase,
      lifecycleState: project.lifecycleState,
      sponsor: project.sponsor,
      summary: project.summary,
      tags: Array.isArray(project.tags) ? project.tags : [],
      functionalDecomposition: Array.isArray(project.functionalDecomposition)
        ? project.functionalDecomposition
        : [],
      physicalDecomposition: Array.isArray(project.physicalDecomposition)
        ? project.physicalDecomposition
        : [],
      requirements: Array.isArray(project.requirements) ? project.requirements : [],
      bom: Array.isArray(project.bom) ? project.bom : [],
      subsystems: Array.isArray(project.subsystems) ? project.subsystems : [],
      interfaces: Array.isArray(project.interfaces) ? project.interfaces : [],
      lastUpdated: project.lastUpdated,
    };
  }
}

function projectPath(storageDir, projectId) {
  return path.join(storageDir, `${projectId}.json`);
}

function logPathFor(storageDir, projectId) {
  return path.join(storageDir, `${projectId}.log`);
}

module.exports = {
  ConflictError,
  NotFoundError,
  ProjectRepository,
};

async function safeMove(source, target) {
  try {
    await fs.rename(source, target);
  } catch (error) {
    if (error.code === "EXDEV") {
      await fs.copyFile(source, target);
      await fs.rm(source, { force: true });
    } else {
      throw error;
    }
  }
}
