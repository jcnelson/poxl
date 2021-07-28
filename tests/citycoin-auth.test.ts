import { assertEquals, describe, Tx, types } from "../deps.ts";
import { CoreClient } from "../src/core-client.ts";
import { AuthClient } from "../src/auth-client.ts";
import { it } from "../src/testutil.ts";

describe("[CityCoin Auth]", () => {
  //////////////////////////////////////////////////
  // JOB MANAGEMENT
  //////////////////////////////////////////////////
  describe("JOB MANAGEMENT", () => {
    describe("get-last-job-id()", () => {
      it("returns u0 if no jobs have been created", (chain, accounts, clients) => {
        // act
        const result = clients.auth.getLastJobId().result;

        // assert
        result.expectUint(0);
      });
      it("returns u1 after a job has been created", (chain, accounts, clients) => {
        // arrange
        const name = "job_1";
        const target = clients.core.getContractAddress();
        const sender = accounts.get("wallet_1")!;

        // act
        chain.mineBlock([clients.auth.createJob(name, target, sender)]);

        const result = clients.auth.getLastJobId().result;

        // assert
        result.expectUint(1);
      });
    });
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
      it("returns 'none' for unknown jobId", (chain, accounts, clients) => {
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
      it("throws ERR_UNKNOWN_JOB while activating unknown job", (chain, accounts, clients) => {
        // arrange
        const jobId = 10;
        const wallet = accounts.get("wallet_4")!;

        // act
        const block = chain.mineBlock([
          clients.auth.activateJob(jobId, wallet),
        ]);

        // assert
        block.receipts[0].result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_UNKNOWN_JOB);
      });

      it("throws ERR_UNAUTHORIZED while activating job by someone who is not its creator", (chain, accounts, clients) => {
        // arrange
        const name = "job-123456";
        const target = clients.core.getContractAddress();
        const creator = accounts.get("wallet_1")!;
        const jobId = 1;
        const wallet = accounts.get("wallet_4")!;

        chain.mineBlock([clients.auth.createJob(name, target, creator)]);

        // act
        const block = chain.mineBlock([
          clients.auth.activateJob(jobId, wallet),
        ]);

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
        const block = chain.mineBlock([
          clients.auth.activateJob(jobId, creator),
        ]);

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
        const block = chain.mineBlock([
          clients.auth.activateJob(jobId, creator),
        ]);

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
        const block = chain.mineBlock([
          clients.auth.approveJob(jobId, approver),
        ]);

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
        const block = chain.mineBlock([
          clients.auth.approveJob(jobId, approver),
        ]);

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
        const block = chain.mineBlock([
          clients.auth.approveJob(jobId, approver),
        ]);

        // assert
        block.receipts[0].result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_ALREADY_APPROVED);
      });

      it("throws ERR_UNAUTHORIZED while approving job by user who is not approver", (chain, accounts, clients) => {
        // arrange
        const name = "job-123456";
        const target = clients.core.getContractAddress();
        const creator = accounts.get("wallet_1")!;
        const approver = accounts.get("wallet_5")!;
        const jobId = 1;
        chain.mineBlock([
          clients.auth.createJob(name, target, creator),
          clients.auth.activateJob(jobId, creator),
        ]);

        // act
        const block = chain.mineBlock([
          clients.auth.approveJob(jobId, approver),
        ]);

        // assert
        block.receipts[0].result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_UNAUTHORIZED);
      });

      it("successfully saves approvals", (chain, accounts, clients) => {
        // arrange
        const name = "job-123456";
        const target = clients.core.getContractAddress();
        const creator = accounts.get("wallet_1")!;
        const approver1 = accounts.get("wallet_2")!;
        const approver2 = accounts.get("wallet_3")!;
        const jobId = 1;
        chain.mineBlock([
          clients.auth.createJob(name, target, creator),
          clients.auth.activateJob(jobId, creator),
        ]);

        // act
        const block = chain.mineBlock([
          clients.auth.approveJob(jobId, approver1),
          clients.auth.approveJob(jobId, approver2),
        ]);

        // assert
        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);

        const expectedJob = {
          creator: creator.address,
          name: types.ascii(name),
          target: target,
          approvals: types.uint(2),
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

    describe("is-job-approved()", () => {
      it("returns false when asked about unknown job", (chain, accounts, clients) => {
        // arrange
        const jobId = 234234;

        // act
        const result = clients.auth.isJobApproved(jobId).result;

        // assert
        result.expectBool(false);
      });

      it("returns false when asked about inactive job", (chain, accounts, clients) => {
        // arrange
        const name = "job-123456";
        const target = clients.core.getContractAddress();
        const creator = accounts.get("wallet_1")!;
        const jobId = 1;
        chain.mineBlock([clients.auth.createJob(name, target, creator)]);

        // act
        const result = clients.auth.isJobApproved(jobId).result;

        // assert
        result.expectBool(false);
      });

      it("returns false when asked about active job without any approvals", (chain, accounts, clients) => {
        // arrange
        const name = "job-123456";
        const target = clients.core.getContractAddress();
        const creator = accounts.get("wallet_1")!;
        const jobId = 1;
        chain.mineBlock([
          clients.auth.createJob(name, target, creator),
          clients.auth.approveJob(jobId, creator),
        ]);

        // act
        const result = clients.auth.isJobApproved(jobId).result;

        // assert
        result.expectBool(false);
      });

      it("returns when asked about active job with 2 or more approvals", (chain, accounts, clients) => {
        // arrange
        const name = "job-123456";
        const target = clients.core.getContractAddress();
        const creator = accounts.get("wallet_1")!;
        const approver1 = accounts.get("wallet_2")!;
        const approver2 = accounts.get("wallet_3")!;
        const jobId = 1;
        chain.mineBlock([
          clients.auth.createJob(name, target, creator),
          clients.auth.activateJob(jobId, creator),
          clients.auth.approveJob(jobId, approver1),
          clients.auth.approveJob(jobId, approver2),
        ]);

        // act
        const result = clients.auth.isJobApproved(jobId).result;

        // assert
        result.expectBool(true);
      });
    });

    describe("mark-job-as-executed()", () => {
      it("throws ERR_UNKNOWN_JOB when requested to mark unknown job", (chain, accounts, clients) => {
        // arrange
        const jobId = 123;
        const sender = accounts.get("wallet_1")!;

        // act
        const block = chain.mineBlock([
          clients.auth.markJobAsExecuted(jobId, sender),
        ]);

        // assert
        block.receipts[0].result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_UNKNOWN_JOB);
      });

      it("throws ERR_JOB_IS_NOT_ACTIVE when requested to mark not active job", (chain, accounts, clients) => {
        // arrange
        const name = "job-name";
        const creator = accounts.get("wallet_1")!;
        const target = clients.core.getContractAddress();
        const jobId = 1;
        const sender = accounts.get("wallet_1")!;
        chain.mineBlock([clients.auth.createJob(name, target, creator)]);

        // act
        const block = chain.mineBlock([
          clients.auth.markJobAsExecuted(jobId, sender),
        ]);

        // assert
        block.receipts[0].result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_JOB_IS_NOT_ACTIVE);
      });

      it("throws ERR_JOB_IS_NOT_APPROVED when requested to mark not approved job", (chain, accounts, clients) => {
        // arrange
        const name = "job-name";
        const creator = accounts.get("wallet_1")!;
        const target = clients.core.getContractAddress();
        const jobId = 1;
        const sender = accounts.get("wallet_1")!;
        chain.mineBlock([
          clients.auth.createJob(name, target, creator),
          clients.auth.activateJob(jobId, creator),
        ]);

        // act
        const block = chain.mineBlock([
          clients.auth.markJobAsExecuted(jobId, sender),
        ]);

        // assert
        block.receipts[0].result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_JOB_IS_NOT_APPROVED);
      });

      it("throws ERR_UNAUTHORIZED when requested to mark as approved not by target", (chain, accounts, clients) => {
        // arrange
        const name = "job-name";
        const creator = accounts.get("wallet_1")!;
        const target = clients.core.getContractAddress();
        const jobId = 1;
        const approver1 = accounts.get("wallet_2")!;
        const approver2 = accounts.get("wallet_3")!;
        const sender = accounts.get("wallet_1")!;
        chain.mineBlock([
          clients.auth.createJob(name, target, creator),
          clients.auth.activateJob(jobId, creator),
          clients.auth.approveJob(jobId, approver1),
          clients.auth.approveJob(jobId, approver2),
        ]);

        // act
        const block = chain.mineBlock([
          clients.auth.markJobAsExecuted(jobId, sender),
        ]);

        // assert
        block.receipts[0].result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_UNAUTHORIZED);
      });

      it("successfully marks job as executed when called by target", (chain, accounts, clients) => {
        // arrange
        const name = "job-name";
        const creator = accounts.get("wallet_1")!;
        const sender = accounts.get("wallet_5")!;
        const target = sender.address;
        const jobId = 1;
        const approver1 = accounts.get("wallet_2")!;
        const approver2 = accounts.get("wallet_3")!;
        chain.mineBlock([
          clients.auth.createJob(name, target, creator),
          clients.auth.activateJob(jobId, creator),
          clients.auth.approveJob(jobId, approver1),
          clients.auth.approveJob(jobId, approver2),
        ]);

        // act
        const block = chain.mineBlock([
          clients.auth.markJobAsExecuted(jobId, sender),
        ]);

        // assert
        block.receipts[0].result.expectOk().expectBool(true);

        const expectedJob = {
          creator: creator.address,
          name: types.ascii(name),
          target: target,
          approvals: types.uint(2),
          isActive: types.bool(true),
          isExecuted: types.bool(true),
        };

        const actualJob = clients.auth
          .getJob(jobId)
          .result.expectSome()
          .expectTuple();
        assertEquals(actualJob, expectedJob);
      });

      it("throws ERR_JOB_IS_EXECUTED while trying to mark same job 2nd time", (chain, accounts, clients) => {
        // arrange
        const name = "job-name";
        const creator = accounts.get("wallet_1")!;
        const sender = accounts.get("wallet_5")!;
        const target = sender.address;
        const jobId = 1;
        const approver1 = accounts.get("wallet_2")!;
        const approver2 = accounts.get("wallet_3")!;
        chain.mineBlock([
          clients.auth.createJob(name, target, creator),
          clients.auth.activateJob(jobId, creator),
          clients.auth.approveJob(jobId, approver1),
          clients.auth.approveJob(jobId, approver2),
          clients.auth.markJobAsExecuted(jobId, sender),
        ]);

        // act
        const block = chain.mineBlock([
          clients.auth.markJobAsExecuted(jobId, sender),
        ]);

        // assert
        block.receipts[0].result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_JOB_IS_EXECUTED);
      });
    });

    describe("add-uint-argument()", () => {
      it("throws ERR_UNKNOWN_JOB while adding argument to unknown job", (chain, accounts, clients) => {
        // arrange
        const sender = accounts.get("wallet_1")!;
        const jobId = 1;
        const argumentName = "test1";
        const value = 123;

        // act
        const block = chain.mineBlock([
          clients.auth.addUIntArgument(jobId, argumentName, value, sender),
        ]);

        // assert
        block.receipts[0].result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_UNKNOWN_JOB);
      });

      it("throws ERR_JOB_IS_ACTIVE while adding argument to active job", (chain, accounts, clients) => {
        // arrange
        const sender = accounts.get("wallet_1")!;
        const jobId = 1;
        const argumentName = "test1";
        const value = 123;
        const jobName = "test-job";
        const target = sender.address;
        chain.mineBlock([
          clients.auth.createJob(jobName, target, sender),
          clients.auth.activateJob(jobId, sender),
        ]);

        // act
        const block = chain.mineBlock([
          clients.auth.addUIntArgument(jobId, argumentName, value, sender),
        ]);

        // assert
        block.receipts[0].result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_JOB_IS_ACTIVE);
      });

      it("throws ERR_UNAUTHORIZED while adding argument by someone who is not job creator", (chain, accounts, clients) => {
        // arrange
        const sender = accounts.get("wallet_1")!;
        const jobId = 1;
        const argumentName = "test1";
        const value = 123;
        const jobName = "test-job";
        const target = sender.address;
        const creator = accounts.get("wallet_2")!;
        chain.mineBlock([clients.auth.createJob(jobName, target, creator)]);

        // act
        const block = chain.mineBlock([
          clients.auth.addUIntArgument(jobId, argumentName, value, sender),
        ]);

        // assert
        block.receipts[0].result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_UNAUTHORIZED);
      });

      it("successfully save new argument", (chain, accounts, clients) => {
        // arrange
        const sender = accounts.get("wallet_1")!;
        const jobId = 1;
        const argumentName = "test1";
        const value = 123;
        const jobName = "test-job";
        const target = sender.address;
        chain.mineBlock([clients.auth.createJob(jobName, target, sender)]);

        // act
        const block = chain.mineBlock([
          clients.auth.addUIntArgument(jobId, argumentName, value, sender),
        ]);

        // assert
        block.receipts[0].result.expectOk().expectBool(true);

        clients.auth
          .getUIntValueByName(jobId, argumentName)
          .result.expectSome()
          .expectUint(value);

        clients.auth
          .getUIntValueById(jobId, 1)
          .result.expectSome()
          .expectUint(value);
      });

      it("throws ERR_ARGUMENT_ALREADY_EXISTS while adding same argument 2nd time", (chain, accounts, clients) => {
        // arrange
        const sender = accounts.get("wallet_1")!;
        const jobId = 1;
        const argumentName = "test1";
        const value = 123;
        const jobName = "test-job";
        const target = sender.address;
        chain.mineBlock([
          clients.auth.createJob(jobName, target, sender),
          clients.auth.addUIntArgument(jobId, argumentName, value, sender),
        ]);

        // act
        const block = chain.mineBlock([
          clients.auth.addUIntArgument(jobId, argumentName, value, sender),
        ]);

        // assert
        block.receipts[0].result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_ARGUMENT_ALREADY_EXISTS);
      });
    });

    describe("add-principal-argument()", () => {
      it("throws ERR_UNKNOWN_JOB while adding argument to unknown job", (chain, accounts, clients) => {
        // arrange
        const sender = accounts.get("wallet_1")!;
        const jobId = 1;
        const argumentName = "test1";
        const value = sender.address;

        // act
        const block = chain.mineBlock([
          clients.auth.addPrincipalArgument(jobId, argumentName, value, sender),
        ]);

        // assert
        block.receipts[0].result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_UNKNOWN_JOB);
      });

      it("throws ERR_JOB_IS_ACTIVE while adding argument to active job", (chain, accounts, clients) => {
        // arrange
        const sender = accounts.get("wallet_1")!;
        const jobId = 1;
        const argumentName = "test1";
        const value = sender.address;
        const jobName = "test-job";
        const target = sender.address;
        chain.mineBlock([
          clients.auth.createJob(jobName, target, sender),
          clients.auth.activateJob(jobId, sender),
        ]);

        // act
        const block = chain.mineBlock([
          clients.auth.addPrincipalArgument(jobId, argumentName, value, sender),
        ]);

        // assert
        block.receipts[0].result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_JOB_IS_ACTIVE);
      });

      it("throws ERR_UNAUTHORIZED while adding argument by someone who is not job creator", (chain, accounts, clients) => {
        // arrange
        const sender = accounts.get("wallet_1")!;
        const jobId = 1;
        const argumentName = "test1";
        const value = sender.address;
        const jobName = "test-job";
        const target = sender.address;
        const creator = accounts.get("wallet_2")!;
        chain.mineBlock([clients.auth.createJob(jobName, target, creator)]);

        // act
        const block = chain.mineBlock([
          clients.auth.addPrincipalArgument(jobId, argumentName, value, sender),
        ]);

        // assert
        block.receipts[0].result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_UNAUTHORIZED);
      });

      it("successfully save new argument", (chain, accounts, clients) => {
        // arrange
        const sender = accounts.get("wallet_1")!;
        const jobId = 1;
        const argumentName = "test1";
        const value = sender.address;
        const jobName = "test-job";
        const target = sender.address;
        chain.mineBlock([clients.auth.createJob(jobName, target, sender)]);

        // act
        const block = chain.mineBlock([
          clients.auth.addPrincipalArgument(jobId, argumentName, value, sender),
        ]);

        // assert
        block.receipts[0].result.expectOk().expectBool(true);

        clients.auth
          .getPrincipalValueByName(jobId, argumentName)
          .result.expectSome()
          .expectPrincipal(value);

        clients.auth
          .getPrincipalValueById(jobId, 1)
          .result.expectSome()
          .expectPrincipal(value);
      });

      it("throws ERR_ARGUMENT_ALREADY_EXISTS while adding same argument 2nd time", (chain, accounts, clients) => {
        // arrange
        const sender = accounts.get("wallet_1")!;
        const jobId = 1;
        const argumentName = "test1";
        const value = sender.address;
        const jobName = "test-job";
        const target = sender.address;
        chain.mineBlock([
          clients.auth.createJob(jobName, target, sender),
          clients.auth.addPrincipalArgument(jobId, argumentName, value, sender),
        ]);

        // act
        const block = chain.mineBlock([
          clients.auth.addPrincipalArgument(jobId, argumentName, value, sender),
        ]);

        // assert
        block.receipts[0].result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_ARGUMENT_ALREADY_EXISTS);
      });
    });
  });
  //////////////////////////////////////////////////
  // CONTRACT MANAGEMENT
  //////////////////////////////////////////////////
  describe("CONTRACT MANAGEMENT", () => {
    describe("get-active-core-contract()", () => {
      it("throws ERR_NO_ACTIVE_CORE_CONTRACT if auth is not initialized", (chain, accounts, clients) => {
        // act
        const result = clients.auth.getActiveCoreContract().result;

        // assert
        result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_NO_ACTIVE_CORE_CONTRACT);
      });
      it("returns correct value after auth is initialized", (chain, accounts, clients) => {
        // arrange
        const sender = accounts.get("wallet_1")!;
        const target = clients.core.getContractAddress();
        chain.mineBlock([clients.auth.testSetActiveCoreContract(sender)]);

        // act
        const result = clients.auth.getActiveCoreContract().result;

        // assert
        result.expectOk().expectPrincipal(target);
      });
    });

    describe("initialize-contracts()", () => {
      it("throws ERR_UNAUTHORIZED if not called by CONTRACT_OWNER", (chain, accounts, clients) => {
        // arrange
        const sender = accounts.get("wallet_2")!;
        const target = clients.core.getContractAddress();

        // act
        const receipt = chain.mineBlock([
          clients.auth.initializeContracts(target, sender),
        ]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_UNAUTHORIZED);
      });

      it("throws ERR_UNAUTHORIZED if auth is already initialized", (chain, accounts, clients) => {
        // arrange
        const sender = accounts.get("deployer")!;
        const target = clients.core.getContractAddress();

        // act
        chain.mineBlock([clients.auth.initializeContracts(target, sender)]);

        const receipt = chain.mineBlock([
          clients.auth.initializeContracts(target, sender),
        ]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_UNAUTHORIZED);
      });

      it("succeeds and updates core contract map", (chain, accounts, clients) => {
        // arrange
        const sender = accounts.get("deployer")!;
        const target = clients.core.getContractAddress();

        // act
        const receipt = chain.mineBlock([
          clients.auth.initializeContracts(target, sender),
        ]).receipts[0];

        const result = clients.auth.getCoreContractInfo(target).result;

        // assert
        receipt.result.expectOk();

        const expectedContractData = {
          state: types.uint(AuthClient.ContractState.STATE_DEPLOYED),
          startHeight: types.uint(0),
          endHeight: types.uint(0),
        };

        const actualContractData = result.expectOk().expectTuple();

        assertEquals(actualContractData, expectedContractData);
      });
    });

    describe("upgrade-core-contract()", () => {
      it("throws ERR_CORE_CONTRACT_NOT_FOUND if principal not found in core contracts map", (chain, accounts, clients) => {
        // arrange
        const sender = accounts.get("wallet_1")!;
        const oldContract = clients.core.getContractAddress();
        const newContract = clients.core.getContractAddress();

        // act
        const receipt = chain.mineBlock([
          clients.auth.upgradeCoreContract(oldContract, newContract, sender),
        ]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_CORE_CONTRACT_NOT_FOUND);
      });
      it("throws ERR_UNAUTHORIZED if old and new contract are the same", (chain, accounts, clients) => {
        // arrange
        const sender = accounts.get("wallet_1")!;
        const oldContract = clients.core.getContractAddress();
        const newContract = clients.core.getContractAddress();

        chain.mineBlock([
          clients.core.testInitializeCore(clients.core.getContractAddress()),
          clients.core.unsafeSetActivationThreshold(1),
          clients.core.registerUser(sender),
        ]);

        // act
        const receipt = chain.mineBlock([
          clients.auth.upgradeCoreContract(oldContract, newContract, sender),
        ]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_UNAUTHORIZED);
      });
      it("throws ERR_UNAUTHORIZED if not called by city wallet", (chain, accounts, clients) => {
        // arrange
        const sender = accounts.get("wallet_1")!;
        const oldContract = clients.core.getContractAddress();
        const newContract = clients.core2.getContractAddress();

        chain.mineBlock([
          clients.core.testInitializeCore(clients.core.getContractAddress()),
          clients.core.unsafeSetActivationThreshold(1),
          clients.core.registerUser(sender),
        ]);

        // act
        const receipt = chain.mineBlock([
          clients.auth.upgradeCoreContract(oldContract, newContract, sender),
        ]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_UNAUTHORIZED);
      });
      it("succeeds and updates core contract map and active variable", (chain, accounts, clients) => {
        // arrange
        const sender = accounts.get("city_wallet")!;
        const oldContract = clients.core.getContractAddress();
        const newContract = clients.core2.getContractAddress();

        chain.mineBlock([
          clients.core.testInitializeCore(oldContract),
          clients.core.unsafeSetActivationThreshold(1),
          clients.core.registerUser(sender),
        ]);

        // act
        const blockUpgrade = chain.mineBlock([
          clients.auth.upgradeCoreContract(oldContract, newContract, sender),
        ]);

        // act
        const activeContract = clients.auth.getActiveCoreContract().result;
        const oldContractData =
          clients.auth.getCoreContractInfo(oldContract).result;
        const newContractData =
          clients.auth.getCoreContractInfo(newContract).result;

        // assert
        blockUpgrade.receipts[0].result.expectOk();

        activeContract.expectOk().expectPrincipal(newContract);

        // TODO: why the +1 and -1 here ??
        const expectedOldContractData = {
          state: types.uint(AuthClient.ContractState.STATE_INACTIVE),
          startHeight: types.uint(CoreClient.ACTIVATION_DELAY + 1),
          endHeight: types.uint(blockUpgrade.height - 1),
        };
        const expectedNewContractData = {
          state: types.uint(AuthClient.ContractState.STATE_DEPLOYED),
          startHeight: types.uint(0),
          endHeight: types.uint(0),
        };
        const actualOldContractData = oldContractData.expectOk().expectTuple();
        const actualNewContractData = newContractData.expectOk().expectTuple();

        assertEquals(actualOldContractData, expectedOldContractData);
        assertEquals(actualNewContractData, expectedNewContractData);
      });
    });
  });

  //////////////////////////////////////////////////
  // CITY WALLET MANAGEMENT
  //////////////////////////////////////////////////
  describe("CITY WALLET MANAGEMENT", () => {
    describe("get-city-wallet()", () => {
      it("succeeds and returns city wallet", (chain, accounts, clients) => {
        // arrange
        const cityWallet = accounts.get("city_wallet")!;
        // act
        const result = clients.auth.getCityWallet().result;
        // assert
        result.expectOk().expectPrincipal(cityWallet.address);
      });
    });
    describe("set-city-wallet()", () => {
      it("throws ERR_CORE_CONTRACT_NOT_FOUND if principal not found in core contracts map", (chain, accounts, clients) => {
        // arrange
        const cityWallet = accounts.get("city_wallet")!;
        const newCityWallet = accounts.get("wallet_2")!;
        // act
        const receipt = chain.mineBlock([
          clients.auth.setCityWallet(
            clients.core.getContractAddress(),
            newCityWallet,
            cityWallet
          ),
        ]).receipts[0];
        // assert
        receipt.result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_CORE_CONTRACT_NOT_FOUND);
      });

      it("throws ERR_UNAUTHORIZED if not called by city wallet", (chain, accounts, clients) => {
        // arrange
        const sender = accounts.get("wallet_1")!;
        const newCityWallet = accounts.get("wallet_2")!;
        chain.mineBlock([
          clients.core.testInitializeCore(clients.core.getContractAddress()),
        ]);
        // act
        const receipt = chain.mineBlock([
          clients.auth.setCityWallet(
            clients.core.getContractAddress(),
            newCityWallet,
            sender
          ),
        ]).receipts[0];
        // assert
        receipt.result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_UNAUTHORIZED);
      });

      it("throws ERR_UNAUTHORIZED if not called by the active core contract", (chain, accounts, clients) => {
        // arrange
        const cityWallet = accounts.get("city_wallet")!;
        const newCityWallet = accounts.get("wallet_2")!;
        chain.mineBlock([
          clients.core.testInitializeCore(clients.core.getContractAddress()),
        ]);
        // act
        const receipt = chain.mineBlock([
          clients.auth.setCityWallet(
            clients.core.getContractAddress(),
            newCityWallet,
            cityWallet
          ),
        ]).receipts[0];
        // assert
        receipt.result
          .expectErr()
          .expectUint(AuthClient.ErrCode.ERR_UNAUTHORIZED);
      });

      it("successfully change city walled when called by current city wallet", (chain, accounts, clients) => {
        // arrange
        const cityWallet = accounts.get("city_wallet")!;
        const newCityWallet = accounts.get("wallet_2")!;
        chain.mineBlock([
          clients.core.testInitializeCore(clients.core.getContractAddress()),
          clients.auth.testSetActiveCoreContract(cityWallet),
        ]);

        // act
        const receipt = chain.mineBlock([
          clients.auth.setCityWallet(
            clients.core.getContractAddress(),
            newCityWallet,
            cityWallet
          ),
        ]).receipts[0];

        // assert
        receipt.result.expectOk().expectBool(true);
        clients.core
          .getCityWallet()
          .result.expectPrincipal(newCityWallet.address);
        clients.auth
          .getCityWallet()
          .result.expectOk()
          .expectPrincipal(newCityWallet.address);
      });
    });
  });
});

/*
  describe("contract-name()", () => {
    it("test", (chain, accounts, clients) => {
      // arrange
      // act
      // assert
    });
  });

  describe("UTILITIES", () => {

    // TODO: should this be tested from AUTH instead, since its the approved caller?
    describe("set-token-uri()", () => {
      it("fails with ERR_UNAUTHORIZED when called by someone who is not core contract", (chain, accounts, clients) => {
        const wallet_2 = accounts.get("wallet_2")!;
        const block = chain.mineBlock([
          clients.token.setTokenUri(wallet_2, "http://something-something.com"),
        ]);

        const receipt = block.receipts[0];

        receipt.result
          .expectErr()
          .expectUint(TokenClient.ErrCode.ERR_UNAUTHORIZED);
      });

      it("changes token uri to none if no new value is provided", (chain, accounts, clients) => {
        const deployer = accounts.get("deployer")!;
        chain.mineBlock([clients.token.setTrustedCaller(deployer)]);

        const block = chain.mineBlock([clients.token.setTokenUri(deployer)]);

        const receipt = block.receipts[0];
        receipt.result.expectOk().expectBool(true);

        const result = clients.token.getTokenUri().result;
        result.expectOk().expectNone();
      });

      it("changes token uri to new value if provided", (chain, accounts, clients) => {
        const deployer = accounts.get("deployer")!;
        const newUri = "http://something-something.com";
        chain.mineBlock([clients.token.setTrustedCaller(deployer)]);

        const block = chain.mineBlock([
          clients.token.setTokenUri(deployer, newUri),
        ]);

        const receipt = block.receipts[0];
        receipt.result.expectOk().expectBool(true);

        const result = clients.token.getTokenUri().result;
        result.expectOk().expectSome().expectUtf8(newUri);
      });
    });
*/
