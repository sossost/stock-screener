import { describe, it, expect } from "vitest";
import { calculateMAStatus } from "../ma-status";

describe("calculateMAStatus", () => {
  describe("정배열 (ordered)", () => {
    it("ma20 > ma50 > ma200이면 정배열 (100일선 제외)", () => {
      const result = calculateMAStatus(150, 140, 130, 120);
      expect(result.ordered).toBe(true);
    });

    it("순서가 맞지 않으면 정배열 아님", () => {
      // ma20 < ma50
      const result = calculateMAStatus(130, 140, 130, 120);
      expect(result.ordered).toBe(false);
    });

    it("ma50 < ma200이면 정배열 아님", () => {
      const result = calculateMAStatus(150, 120, 130, 140);
      expect(result.ordered).toBe(false);
    });

    it("ma100은 무시됨 (호환성 유지)", () => {
      // ma100이 ma50보다 작아도 정배열 (ma20 > ma50 > ma200이면 OK)
      const result = calculateMAStatus(150, 140, 100, 120);
      expect(result.ordered).toBe(true);
    });

    it("하나라도 null이면 정배열 아님 (ma100 제외)", () => {
      expect(calculateMAStatus(null, 140, 130, 120).ordered).toBe(false);
      expect(calculateMAStatus(150, null, 130, 120).ordered).toBe(false);
      expect(calculateMAStatus(150, 140, null, 120).ordered).toBe(true); // ma100은 null이어도 OK
      expect(calculateMAStatus(150, 140, 130, null).ordered).toBe(false);
    });

    it("모두 null이면 정배열 아님", () => {
      const result = calculateMAStatus(null, null, null, null);
      expect(result.ordered).toBe(false);
    });
  });

  describe("골든크로스 (goldenCross)", () => {
    it("ma50 > ma200이면 골든크로스", () => {
      const result = calculateMAStatus(150, 140, 130, 120);
      expect(result.goldenCross).toBe(true);
    });

    it("ma50 < ma200이면 골든크로스 아님 (데드크로스)", () => {
      const result = calculateMAStatus(150, 100, 130, 120);
      expect(result.goldenCross).toBe(false);
    });

    it("ma50 === ma200이면 골든크로스 아님", () => {
      const result = calculateMAStatus(150, 120, 130, 120);
      expect(result.goldenCross).toBe(false);
    });

    it("ma50이 null이면 골든크로스 아님", () => {
      const result = calculateMAStatus(150, null, 130, 120);
      expect(result.goldenCross).toBe(false);
    });

    it("ma200이 null이면 골든크로스 아님", () => {
      const result = calculateMAStatus(150, 140, 130, null);
      expect(result.goldenCross).toBe(false);
    });

    it("정배열 아니어도 골든크로스 가능", () => {
      // ma20 < ma50이지만 ma50 > ma200
      const result = calculateMAStatus(130, 140, 130, 120);
      expect(result.ordered).toBe(false);
      expect(result.goldenCross).toBe(true);
    });
  });
});
