const test = require("node:test");
const assert = require("node:assert/strict");

const { validateCreateIssue } = require("../validators/issue.validator");
const { validateCreateProject } = require("../validators/project.validator");
const { validateUpdateIssue } = require("../validators/updateIssue.validator");

const objectId = "507f1f77bcf86cd799439011";
const otherObjectId = "507f191e810c19729de860ea";

test("create issue accepts a valid individual assignment", () => {
  assert.deepEqual(validateCreateIssue({
    title: "Implement login",
    assigneeId: objectId,
    status: "TODO",
    priority: "HIGH",
  }), {});
});

test("create issue accepts a valid team assignment", () => {
  assert.deepEqual(validateCreateIssue({
    title: "Review release",
    assigneeTeamId: objectId,
    labels: ["release"],
  }), {});
});

test("create issue rejects simultaneous individual and team assignment", () => {
  const errors = validateCreateIssue({
    title: "Review release",
    assigneeId: objectId,
    assigneeTeamId: otherObjectId,
  });
  assert.ok(errors.assignee);
});

test("create issue rejects malformed assignment and sprint ids", () => {
  const errors = validateCreateIssue({
    title: "Review release",
    assigneeTeamId: "not-an-object-id",
    sprintId: "invalid",
  });
  assert.ok(errors.assigneeTeamId);
  assert.ok(errors.sprintId);
});

test("create issue rejects unknown status, oversized labels and invalid dates", () => {
  const errors = validateCreateIssue({
    title: "Review release",
    status: "CANCELLED",
    labels: Array.from({ length: 21 }, (_, index) => `label-${index}`),
    dueDate: "not-a-date",
  });
  assert.ok(errors.status);
  assert.ok(errors.labels);
  assert.ok(errors.dueDate);
});

test("create project accepts unique team ids and a lead", () => {
  assert.deepEqual(validateCreateProject({
    name: "Platform",
    key: "PLAT",
    slug: "platform",
    lead: objectId,
    teamIds: [objectId, otherObjectId],
  }), {});
});

test("create project rejects duplicate or malformed team ids", () => {
  const errors = validateCreateProject({
    name: "Platform",
    key: "PLAT",
    slug: "platform",
    teamIds: [objectId, objectId],
  });
  assert.ok(errors.teamIds);
});

test("update issue accepts either individual or team assignment", () => {
  assert.deepEqual(validateUpdateIssue({ assigneeTeam: objectId }), {
    data: { assigneeTeam: objectId },
  });
  assert.deepEqual(validateUpdateIssue({ assignee: objectId }), {
    data: { assignee: objectId },
  });
});

test("update issue rejects simultaneous assignees and unknown fields", () => {
  assert.equal(
    validateUpdateIssue({ assignee: objectId, assigneeTeam: otherObjectId }).error,
    "Choose an individual or a team, not both",
  );
  assert.equal(validateUpdateIssue({ reporter: objectId }).error, "Invalid or empty update fields");
});

test("update issue allows explicit assignment clearing", () => {
  assert.deepEqual(validateUpdateIssue({ assignee: null, assigneeTeam: null }), {
    data: { assignee: null, assigneeTeam: null },
  });
});
