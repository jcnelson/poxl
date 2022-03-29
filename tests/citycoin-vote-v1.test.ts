import { describe, assertEquals, types, Account, run, Chain, it, beforeEach} from "../deps.ts";
import { CoreModel } from "../models/core.model.ts";
import { TokenModel } from "../models/token.model.ts";
import { VoteModel } from "../models/vote.model.ts";
import { Accounts, Context } from "../src/context.ts";

let ctx: Context;
let chain: Chain;
let accounts: Accounts;
let core: CoreModel;
let token: TokenModel;
let vote: VoteModel;

beforeEach(() => {
  ctx = new Context();
  chain = ctx.chain;
  accounts = ctx.accounts;
  core = ctx.models.get(CoreModel);
  token = ctx.models.get(TokenModel);
  vote = ctx.models.get(VoteModel);
})

describe("[CityCoin Vote v1]", () => {
  // vote-on-proposal
    // succeeds with yes vote when called by a new voter
      // check proposal record values
      // check voter record values
      // check with MIA, with NYC, with both
    // succeeds with no vote when called by a new voter
    // fails when called by an existing voter with same vote
    // succeeds when called by an existing voter with different vote
      // check proposal record values
      // check voter record values
      // check with MIA, with NYC, with both
  describe("vote-on-proposal()", () => {
    it("fails when called before proposal is active", () => {
      // arrange
      const wallet = accounts.get("wallet_1")!;
      // act
      const receipt = chain.mineBlock([
        vote.voteOnProposal(true, wallet)
      ]).receipts[0];
      // assert
      receipt.result.expectErr().expectUint(VoteModel.ErrCode.ERR_PROPOSAL_NOT_ACTIVE);
    });
    it("fails when called after proposal is active", () => {
      // arrange
      const wallet = accounts.get("wallet_1")!;
      chain.mineEmptyBlock(VoteModel.VOTE_START_BLOCK + VoteModel.VOTE_END_BLOCK + 1);
      // act
      const receipt = chain.mineBlock([
        vote.voteOnProposal(true, wallet)
      ]).receipts[0];
      // assert
      receipt.result.expectErr().expectUint(VoteModel.ErrCode.ERR_PROPOSAL_NOT_ACTIVE);
    });
    it("fails when user has no stacked tokens", () => {
      // arrange
      const wallet = accounts.get("wallet_1")!;
      chain.mineEmptyBlock(VoteModel.VOTE_START_BLOCK + 1);
      // act
      const receipt = chain.mineBlock([
        vote.voteOnProposal(true, wallet)
      ]).receipts[0];
      // assert
      receipt.result.expectErr().expectUint(VoteModel.ErrCode.ERR_NOTHING_STACKED);
    });
    it("succeeds with yes vote when called by a new voter", () => {
      // arrange
      const stacker = accounts.get("wallet_1")!;
      const amountTokens = 1000;
      const lockPeriod = 5;
      const avgStacked = (amountTokens + (amountTokens * 2) ) / 2;
      const scaledMia = Math.round(avgStacked * VoteModel.MIA_SCALE_FACTOR);
      const block = chain.mineBlock([
        core.testInitializeCore(core.address),
        core.unsafeSetActivationThreshold(1),
        core.registerUser(stacker),
        token.ftMint(amountTokens, stacker),
      ]);
      const activationBlockHeight =
        block.height + CoreModel.ACTIVATION_DELAY - 1;
      chain.mineEmptyBlockUntil(activationBlockHeight);

      // stack in cycles 2-3
      chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
      chain.mineBlock([
        core.stackTokens(amountTokens / 2, lockPeriod, stacker),
      ]);
      chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
      chain.mineBlock([
        core.stackTokens(amountTokens / 2, lockPeriod, stacker),
      ]);
      chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);

      chain.mineEmptyBlockUntil(VoteModel.VOTE_START_BLOCK + 1);

      // act
      const receipt = chain.mineBlock([
        vote.voteOnProposal(true, stacker)
      ]).receipts[0];

      // set vote information to verify
      const expectedProposalRecord = {
        noCount: types.uint(0),
        noMia: types.uint(0),
        noNyc: types.uint(0),
        noTotal: types.uint(0),
        yesCount: types.uint(1),
        yesMia: types.uint(scaledMia),
        yesNyc: types.uint(avgStacked),
        yesTotal: types.uint(scaledMia + avgStacked)
      }

      // set voter information to verify
      const expectedVoterRecord = {
        mia: types.uint(scaledMia),
        nyc: types.uint(avgStacked),
        total: types.uint(scaledMia + avgStacked),
        vote: types.bool(true)
      }

      const proposalRecord = vote.getProposalVotes().result;
      const voterRecord = vote.getVoterInfo(stacker).result;

      // assert
      receipt.result.expectOk();
      assertEquals(proposalRecord.expectSome().expectTuple(), expectedProposalRecord);
      assertEquals(voterRecord.expectOk().expectTuple(), expectedVoterRecord);

    });
  });
  
  describe("get-proposal-votes()", () => {
    it("succeeds with base proposal record with no voters", () => {
      // arrange
      const result = vote.getProposalVotes().result;
      // TODO: refine like SendManyRecord in token model
      const expected = {
        noCount: 0,
        noMia: 0,
        noNyc: 0,
        noTotal: 0,
        yesCount: 0,
        yesMia: 0,
        yesNyc: 0,
        yesTotal: 0
      }
      // assert
      assertEquals(result.expectSome().expectTuple(), {
        noCount: types.uint(expected.noCount),
        noMia: types.uint(expected.noMia),
        noNyc: types.uint(expected.noNyc),
        noTotal: types.uint(expected.noTotal),
        yesCount: types.uint(expected.yesCount),
        yesMia: types.uint(expected.yesMia),
        yesNyc: types.uint(expected.yesNyc),
        yesTotal: types.uint(expected.yesTotal)
      })
    });
    //it("succeeds with voter data after successful vote", () => {
      // arrange
      // act
      // assert
    //}
  });

  // get-voter
    // succeeds with none if voter not found
    // succeeds with some if voter found
  //describe("get-voter()", () => {
  //
  //}

  // get-voter-id
    // succeeds with none if voter not found
    // succeeds with some if voter found
  //describe("get-voter-id()", () => {
  //
  //}

  // get-voter-info
    // succeeds with ok none if voter not found
    // succeeds with ok some if voter found
  //describe("get-voter-info()", () => {
  //
  //}
});

run();