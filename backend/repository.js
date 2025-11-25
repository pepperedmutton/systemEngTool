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
  constructor(storagePath) {
    this.storagePath = storagePath;
    this.lock = Promise.resolve();
    this.ready = this.ensureStorage();
  }

  async ensureStorage() {
    await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
    try {
      await fs.access(this.storagePath);
    } catch {
      await fs.writeFile(this.storagePath, "[]", "utf8");
    }
  }

  async withLock(action) {
    const run = this.lock.then(() => action());
    this.lock = run.catch(() => {});
    return run;
  }

  async listProjects() {
    return this.readProjects();
  }

  async getProject(projectId) {
    const projects = await this.readProjects();
    return projects.find((project) => project.id === projectId) || null;
  }

  async createProject(payload) {
    return this.withLock(async () => {
      const projects = await this.readProjects();
      if (projects.some((project) => project.id === payload.id)) {
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

      projects.push(project);
      await this.writeProjects(projects);
      return project;
    });
  }

  async replaceProject(projectId, payload) {
    return this.withLock(async () => {
      const projects = await this.readProjects();
      const index = projects.findIndex((project) => project.id === projectId);
      if (index === -1) {
        throw new NotFoundError(`Project ${projectId} not found`);
      }

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

      projects[index] = updated;
      await this.writeProjects(projects);
      return updated;
    });
  }

  async updateProject(projectId, updates) {
    return this.withLock(async () => {
      const projects = await this.readProjects();
      const index = projects.findIndex((project) => project.id === projectId);
      if (index === -1) {
        throw new NotFoundError(`Project ${projectId} not found`);
      }

      const project = projects[index];
      const updated = {
        ...project,
        ...updates,
        lastUpdated: new Date().toISOString(),
      };
      projects[index] = updated;
      await this.writeProjects(projects);
      return updated;
    });
  }

  async deleteProject(projectId) {
    return this.withLock(async () => {
      const projects = await this.readProjects();
      const filtered = projects.filter((project) => project.id !== projectId);
      if (filtered.length === projects.length) {
        throw new NotFoundError(`Project ${projectId} not found`);
      }
      await this.writeProjects(filtered);
    });
  }

  async addRequirement(projectId, payload) {
    return this.withLock(async () => {
      const projects = await this.readProjects();
      const index = projects.findIndex((project) => project.id === projectId);
      if (index === -1) {
        throw new NotFoundError(`Project ${projectId} not found`);
      }
      const project = projects[index];
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
      projects[index] = updated;
      await this.writeProjects(projects);
      return requirement;
    });
  }

  async updateRequirement(projectId, requirementId, updates) {
    return this.withLock(async () => {
      const projects = await this.readProjects();
      const projectIndex = projects.findIndex((project) => project.id === projectId);
      if (projectIndex === -1) {
        throw new NotFoundError(`Project ${projectId} not found`);
      }

      const project = projects[projectIndex];
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
      projects[projectIndex] = {
        ...project,
        requirements,
        lastUpdated: new Date().toISOString(),
      };
      await this.writeProjects(projects);
      return updatedRequirement;
    });
  }

  async deleteRequirement(projectId, requirementId) {
    return this.withLock(async () => {
      const projects = await this.readProjects();
      const projectIndex = projects.findIndex((project) => project.id === projectId);
      if (projectIndex === -1) {
        throw new NotFoundError(`Project ${projectId} not found`);
      }

      const project = projects[projectIndex];
      const filtered = (project.requirements || []).filter((req) => req.id !== requirementId);
      if (filtered.length === (project.requirements || []).length) {
        throw new NotFoundError(`Requirement ${projectId}:${requirementId} not found`);
      }

      projects[projectIndex] = {
        ...project,
        requirements: filtered,
        lastUpdated: new Date().toISOString(),
      };
      await this.writeProjects(projects);
    });
  }

  async readProjects() {
    await this.ready;
    try {
      const raw = await fs.readFile(this.storagePath, "utf8");
      if (!raw.trim()) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async writeProjects(projects) {
    const payload = JSON.stringify(projects, null, 2);
    await fs.writeFile(this.storagePath, payload, "utf8");
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
}

module.exports = {
  ConflictError,
  NotFoundError,
  ProjectRepository,
};
