import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateFnskuZpl, type FnskuZplInput } from "../src/index";

interface Fixture {
  name: string;
  input: FnskuZplInput;
  expectedZpl: string;
}

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "fnsku");
const files = readdirSync(fixturesDir).filter((f) => f.endsWith(".json"));

describe("FNSKU ZPL conformance (vs jasara/azlabels-api)", () => {
  it("has a synced corpus (run `npm run sync-fixtures`)", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const fixture: Fixture = JSON.parse(
      readFileSync(join(fixturesDir, file), "utf8"),
    );

    it(`matches ${fixture.name}`, () => {
      expect(generateFnskuZpl(fixture.input)).toBe(fixture.expectedZpl);
    });
  }
});
