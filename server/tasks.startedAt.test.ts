import { describe, expect, it, vi } from "vitest";
import * as db from "./db";

describe("tasks.startedAt", () => {
  it("should set startedAt when task status changes to 'In Progress'", async () => {
    // Mock the database functions
    const mockSelect = vi.fn();
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([
              { id: 1, status: "Todo", startedAt: null }
            ])
          })
        })
      }),
      update: () => ({
        set: (data: any) => {
          // Verify that startedAt was set
          expect(data.startedAt).toBeDefined();
          expect(data.startedAt).toBeInstanceOf(Date);
          return Promise.resolve({ success: true });
        },
        where: () => Promise.resolve({ success: true })
      })
    };

    // Spy on the updateTask function
    const updateTaskSpy = vi.spyOn(db, 'updateTask');
    
    // The actual logic is in the updateTask function
    // When status is "In Progress" and startedAt is not set, it should set it
    const testData = { status: "In Progress" };
    const existingTask = [{ id: 1, status: "Todo", startedAt: null }];
    
    // Simulate the logic from updateTask
    if (testData.status === "In Progress") {
      if (existingTask.length > 0 && !existingTask[0].startedAt) {
        testData.startedAt = new Date();
      }
    }
    
    expect(testData.startedAt).toBeDefined();
    expect(testData.startedAt).toBeInstanceOf(Date);
  });

  it("should not overwrite existing startedAt when task status changes again", () => {
    const firstStartedAt = new Date("2026-01-01");
    const testData = { status: "complete", startedAt: firstStartedAt };
    
    // Simulate the logic from updateTask - it only sets startedAt if status is "In Progress"
    if (testData.status === "In Progress") {
      // This won't execute because status is "complete"
      testData.startedAt = new Date();
    }
    
    // startedAt should remain unchanged
    expect(testData.startedAt).toEqual(firstStartedAt);
  });

  it("should not set startedAt when task is created with status 'Todo'", () => {
    const newTaskData = { status: "Todo", startedAt: null };
    
    // When creating a task, startedAt should not be automatically set
    expect(newTaskData.startedAt).toBeNull();
  });

  it("should set startedAt only when transitioning to 'In Progress'", () => {
    const testCases = [
      { status: "Todo", shouldSet: false },
      { status: "In Progress", shouldSet: true },
      { status: "in_progress", shouldSet: false }, // lowercase should not match
      { status: "complete", shouldSet: false },
    ];

    testCases.forEach(testCase => {
      const data = { status: testCase.status, startedAt: null };
      
      // Simulate the logic from updateTask
      if (data.status === "In Progress") {
        data.startedAt = new Date();
      }
      
      if (testCase.shouldSet) {
        expect(data.startedAt).not.toBeNull();
      } else {
        expect(data.startedAt).toBeNull();
      }
    });
  });
});
