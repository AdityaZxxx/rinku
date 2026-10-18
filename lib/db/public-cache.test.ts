/// <reference types="bun-types" />
import { describe, expect, it, mock } from "bun:test";

const updateTag = mock();
const afterTasks: Array<() => void> = [];

// The Next runtime is mocked wholesale: the point is the ordering contract
// with it, not what next/cache does internally.
mock.module("next/cache", () => ({ updateTag }));
mock.module("next/server", () => ({
  after: (task: () => void) => {
    afterTasks.push(task);
  },
}));

const { expirePublicProfileCache } = await import("./public-cache");

describe("expirePublicProfileCache", () => {
  it("keeps the tag untouched while the action response is still open", () => {
    expirePublicProfileCache();
    expect(updateTag).not.toHaveBeenCalled();
    expect(afterTasks).toHaveLength(1);
  });

  it("expires the public-profile tag once the response-sent callback runs", () => {
    afterTasks.splice(0, afterTasks.length)[0]?.();
    expect(updateTag).toHaveBeenCalledTimes(1);
    expect(updateTag).toHaveBeenCalledWith("public-profile");
  });

  it("expires the tag once per call, so rapid commits all land", () => {
    afterTasks.splice(0, afterTasks.length);
    updateTag.mockClear();
    expirePublicProfileCache();
    expirePublicProfileCache();
    for (const task of afterTasks.splice(0, afterTasks.length)) {
      task();
    }
    expect(updateTag).toHaveBeenCalledTimes(2);
  });
});
