import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../app.js";

describe("health route", () => {
  it("returns API health status", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.service).toBe("risklens-api");
  });
});
