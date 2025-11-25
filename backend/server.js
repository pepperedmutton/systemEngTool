const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");

const { ConflictError, NotFoundError, ProjectRepository } = require("./repository");

const DEFAULT_PORT = 8001;
const DEFAULT_HOST = "127.0.0.1";
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "data", "projects.json");

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--host" || current === "-H") {
      parsed.host = argv[index + 1];
      index += 1;
    } else if (current === "--port" || current === "-P") {
      parsed.port = Number.parseInt(argv[index + 1], 10);
      index += 1;
    }
  }
  return parsed;
}

const cliArgs = parseArgs(process.argv.slice(2));
const host = cliArgs.host || process.env.HOST || process.env.BIND_HOST || DEFAULT_HOST;
const port = cliArgs.port || Number(process.env.PORT || process.env.API_PORT || DEFAULT_PORT);

const repo = new ProjectRepository(DATA_FILE);
const app = express();

const allowedOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/i;
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigin.test(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: false,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/_debug/middlewares", (req, res) => {
  const stack = (app._router?.stack || [])
    .map((layer) => layer?.name)
    .filter((name) => name && name !== "<anonymous>");
  res.json({ middlewares: stack });
});

app.get("/projects", async (req, res, next) => {
  try {
    const projects = await repo.listProjects();
    res.json(projects);
  } catch (error) {
    next(error);
  }
});

app.get("/projects/:projectId", async (req, res, next) => {
  try {
    const project = await repo.getProject(req.params.projectId);
    if (!project) {
      throw new NotFoundError("Project not found");
    }
    res.json(project);
  } catch (error) {
    next(error);
  }
});

app.post("/projects", async (req, res, next) => {
  try {
    const payload = normalizeProjectCreate(req.body);
    const project = await repo.createProject(payload);
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
});

app.put("/projects/:projectId", async (req, res, next) => {
  try {
    const payload = normalizeProjectCreate(req.body);
    const project = await repo.replaceProject(req.params.projectId, payload);
    res.json(project);
  } catch (error) {
    next(error);
  }
});

app.patch("/projects/:projectId", async (req, res, next) => {
  try {
    const updates = normalizeProjectUpdate(req.body);
    const project = await repo.updateProject(req.params.projectId, updates);
    res.json(project);
  } catch (error) {
    next(error);
  }
});

app.delete("/projects/:projectId", async (req, res, next) => {
  try {
    await repo.deleteProject(req.params.projectId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.post("/projects/:projectId/requirements", async (req, res, next) => {
  try {
    const payload = normalizeRequirement(req.body);
    const requirement = await repo.addRequirement(req.params.projectId, payload);
    res.status(201).json(requirement);
  } catch (error) {
    next(error);
  }
});

app.put("/projects/:projectId/requirements/:requirementId", async (req, res, next) => {
  try {
    const updates = normalizeRequirement(req.body, { allowPartial: true });
    const requirement = await repo.updateRequirement(
      req.params.projectId,
      req.params.requirementId,
      updates,
    );
    res.json(requirement);
  } catch (error) {
    next(error);
  }
});

app.delete("/projects/:projectId/requirements/:requirementId", async (req, res, next) => {
  try {
    await repo.deleteRequirement(req.params.projectId, req.params.requirementId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

const frontendDist = path.resolve(__dirname, "..", "frontend", "dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use((error, req, res, next) => {
  if (error instanceof ValidationError) {
    return res.status(400).json({ detail: error.message });
  }
  if (error instanceof ConflictError) {
    return res.status(409).json({ detail: error.message });
  }
  if (error instanceof NotFoundError) {
    return res.status(404).json({ detail: error.message });
  }
  if (error?.message === "Not allowed by CORS") {
    return res.status(403).json({ detail: "Origin not allowed" });
  }

  // eslint-disable-next-line no-console
  console.error(error);
  return res.status(500).json({ detail: "Internal server error" });
});

app.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://${host}:${port}`);
});

function normalizeProjectCreate(body) {
  const project = {
    id: body?.id,
    name: body?.name,
    missionPhase: body?.missionPhase ?? body?.mission_phase,
    lifecycleState: body?.lifecycleState ?? body?.lifecycle_state,
    sponsor: body?.sponsor,
    summary: body?.summary,
    tags: pickArray(body?.tags),
    functionalDecomposition: pickArray(
      body?.functionalDecomposition,
      body?.functional_decomposition,
    ),
    physicalDecomposition: pickArray(
      body?.physicalDecomposition,
      body?.physical_decomposition,
    ),
    requirements: pickArray(body?.requirements).map((req) => normalizeRequirement(req)),
    bom: pickArray(body?.bom),
    subsystems: pickArray(body?.subsystems),
    interfaces: pickArray(body?.interfaces),
  };

  const missingFields = [
    ["id", project.id],
    ["name", project.name],
    ["missionPhase", project.missionPhase],
    ["lifecycleState", project.lifecycleState],
    ["sponsor", project.sponsor],
    ["summary", project.summary],
  ]
    .filter(([, value]) => !isNonEmptyString(value))
    .map(([field]) => field);

  if (missingFields.length) {
    throw new ValidationError(`Missing required fields: ${missingFields.join(", ")}`);
  }

  return project;
}

function normalizeProjectUpdate(body) {
  const updates = {};

  assignIfDefined(updates, "name", body?.name);
  assignIfDefined(updates, "missionPhase", body?.missionPhase ?? body?.mission_phase);
  assignIfDefined(updates, "lifecycleState", body?.lifecycleState ?? body?.lifecycle_state);
  assignIfDefined(updates, "sponsor", body?.sponsor);
  assignIfDefined(updates, "summary", body?.summary);

  if (body?.tags !== undefined) {
    updates.tags = pickArray(body.tags);
  }
  if (body?.functionalDecomposition !== undefined || body?.functional_decomposition !== undefined) {
    updates.functionalDecomposition = pickArray(
      body.functionalDecomposition,
      body.functional_decomposition,
    );
  }
  if (body?.physicalDecomposition !== undefined || body?.physical_decomposition !== undefined) {
    updates.physicalDecomposition = pickArray(
      body.physicalDecomposition,
      body.physical_decomposition,
    );
  }
  if (body?.bom !== undefined) {
    updates.bom = pickArray(body.bom);
  }
  if (body?.subsystems !== undefined) {
    updates.subsystems = pickArray(body.subsystems);
  }
  if (body?.interfaces !== undefined) {
    updates.interfaces = pickArray(body.interfaces);
  }
  if (body?.requirements !== undefined) {
    updates.requirements = pickArray(body.requirements).map((req) => normalizeRequirement(req, { allowPartial: true }));
  }

  return updates;
}

function normalizeRequirement(body, options = {}) {
  const allowPartial = options.allowPartial || false;
  const payload = {};
  assignIfDefined(payload, "title", body?.title);
  assignIfDefined(payload, "statement", body?.statement);
  assignIfDefined(payload, "rationale", body?.rationale);
  assignIfDefined(
    payload,
    "verificationMethod",
    body?.verificationMethod ?? body?.verification_method,
  );
  assignIfDefined(payload, "status", body?.status ?? (allowPartial ? undefined : "Draft"));
  assignIfDefined(payload, "owner", body?.owner);
  assignIfDefined(payload, "priority", body?.priority ?? (allowPartial ? undefined : "Medium"));
  assignIfDefined(payload, "scope", body?.scope ?? (allowPartial ? undefined : "system"));

  if (!allowPartial) {
    const missing = [
      ["title", payload.title],
      ["statement", payload.statement],
      ["rationale", payload.rationale],
      ["verificationMethod", payload.verificationMethod],
      ["status", payload.status],
      ["owner", payload.owner],
    ]
      .filter(([, value]) => !isNonEmptyString(value))
      .map(([field]) => field);

    if (missing.length) {
      throw new ValidationError(`Missing required requirement fields: ${missing.join(", ")}`);
    }
  }

  return payload;
}

function pickArray(primary, secondary) {
  if (primary !== undefined) {
    return Array.isArray(primary) ? primary : [];
  }
  if (secondary !== undefined) {
    return Array.isArray(secondary) ? secondary : [];
  }
  return [];
}

function assignIfDefined(target, key, value) {
  if (value !== undefined) {
    target[key] = value;
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
