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

  describe("activate-job()", () => {
    it("throws ERR_UNKNOWN_JOB while activating unknonw job", (chain, accounts, clients) => {
      // arrage
      const jobId = 10;
      const wallet = accounts.get("wallet_4")!;

      // act
      const block = chain.mineBlock([clients.auth.activateJob(jobId, wallet)]);

      // assert
      block.receipts[0].result
        .expectErr()
        .expectUint(AuthClient.ErrCode.ERR_UNKNOWN_JOB);
    });

    it("throws ERR_UNAUTHORIZED while activating job by someone who is not its creator", (chain, accounts, clients) => {
      // arrage
      const name = "job-123456";
      const target = clients.core.getContractAddress();
      const creator = accounts.get("wallet_1")!;
      const jobId = 1;
      const wallet = accounts.get("wallet_4")!;

      chain.mineBlock([clients.auth.createJob(name, target, creator)]);

      // act
      const block = chain.mineBlock([clients.auth.activateJob(jobId, wallet)]);

      // assert
      block.receipts[0].result
        .expectErr()
        .expectUint(AuthClient.ErrCode.ERR_UNAUTHORIZED);
    });

    it("throws ERR_JOB_IS_ACTIVE while activating job that is already active", (chain, accounts, clients) => {
      // arrange
      const name = "job-123456";
      const target = clients.core.getContractAddress();
      const creator = accounts.get("wallet_1")!;
      const jobId = 1;
      chain.mineBlock([
        clients.auth.createJob(name, target, creator),
        clients.auth.activateJob(1, creator),
      ]);

      // act
      const block = chain.mineBlock([clients.auth.activateJob(jobId, creator)]);

      // assert
      block.receipts[0].result
        .expectErr()
        .expectUint(AuthClient.ErrCode.ERR_JOB_IS_ACTIVE);
    });

    it("successfully activate job by its creator", (chain, accounts, clients) => {
      // arrange
      const name = "job-123456";
      const target = clients.core.getContractAddress();
      const creator = accounts.get("wallet_1")!;
      const jobId = 1;
      chain.mineBlock([clients.auth.createJob(name, target, creator)]);

      // act
      const block = chain.mineBlock([clients.auth.activateJob(jobId, creator)]);

      // assert
      block.receipts[0].result.expectOk().expectBool(true);

      const expectedJob = {
        creator: creator.address,
        name: types.ascii(name),
        target: target,
        approvals: types.uint(0),
        isActive: types.bool(true),
        isExecuted: types.bool(false),
      };

      const actualJob = clients.auth
        .getJob(jobId)
        .result.expectSome()
        .expectTuple();

      assertEquals(actualJob, expectedJob);
    });
  });

  describe("approve-job()", () => {
    it("throws ERR_UNKNOWN_JOB while approving unknown job", (chain, accounts, clients) => {
      // arrange
      const approver = accounts.get("wallet_2")!;
      const jobId = 399;

      // act
      const block = chain.mineBlock([clients.auth.approveJob(jobId, approver)]);

      // assert
      block.receipts[0].result
        .expectErr()
        .expectUint(AuthClient.ErrCode.ERR_UNKNOWN_JOB);
    });

    it("throws ERR_JOB_IS_NOT_ACTIVE while approving not active job", (chain, accounts, clients) => {
      // arrange
      const name = "job-123456";
      const target = clients.core.getContractAddress();
      const creator = accounts.get("wallet_1")!;
      const approver = accounts.get("wallet_2")!;
      const jobId = 1;
      chain.mineBlock([clients.auth.createJob(name, target, creator)]);

      // act
      const block = chain.mineBlock([clients.auth.approveJob(jobId, approver)]);

      // assert
      block.receipts[0].result
        .expectErr()
        .expectUint(AuthClient.ErrCode.ERR_JOB_IS_NOT_ACTIVE);
    });

    it("throws ERR_ALREADY_APPROVED while approving job previously approved", (chain, accounts, clients) => {
      // arrange
      const name = "job-123456";
      const target = clients.core.getContractAddress();
      const creator = accounts.get("wallet_1")!;
      const approver = accounts.get("wallet_2")!;
      const jobId = 1;
      chain.mineBlock([
        clients.auth.createJob(name, target, creator),
        clients.auth.activateJob(jobId, creator),
        clients.auth.approveJob(jobId, approver),
      ]);

      // act
      const block = chain.mineBlock([clients.auth.approveJob(jobId, approver)]);

      // assert
      block.receipts[0].result
        .expectErr()
        .expectUint(AuthClient.ErrCode.ERR_ALREADY_APPROVED);
    });
  });
});
