import { assertEquals, describe, Tx, types } from "../deps.ts";
import { AuthClient } from "../src/auth-client.ts";
import { it } from "../src/testutil.ts";

describe("[CityCoin Auth]", () => {
  describe("create-job()", () => {
    it("creates new job", (chain, accounts, clients) => {
      // arrange
      const name = "job_1";
      const target = clients.core.getContractAddress();
      const sender = accounts.get("wallet_1")!;

      // act
      const block = chain.mineBlock([
        clients.auth.createJob(name, target, sender),
      ]);

      // assert
      block.receipts[0].result.expectOk().expectUint(1);
    });
  });

  describe("get-job()", () => {
    it("returns 'none' for unknow jobId", (chain, accounts, clients) => {
      // arrange
      const jobId = 1;

      // act
      const result = clients.auth.getJob(jobId).result;

      // assert
      result.expectNone();
    });

    it("returns 'some' with job details for known jobId", (chain, accounts, clients) => {
      // arrange
      const name = "job123";
      const target = clients.core.getContractAddress();
      const sender = accounts.get("wallet_1")!;
      chain.mineBlock([clients.auth.createJob(name, target, sender)]);

      // act
      const result = clients.auth.getJob(1).result;

      // assert
      const expectedJob = {
        creator: sender.address,
        name: types.ascii(name),
        target: target,
        approvals: types.uint(0),
        isActive: types.bool(false),
        isExecuted: types.bool(false),
      };
      const actualJob = result.expectSome().expectTuple();
      assertEquals(actualJob, expectedJob);
    });
  });
});
