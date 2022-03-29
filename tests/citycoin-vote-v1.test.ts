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

describe("[CityCoin Vote]", () => {
  describe("VOTE ACTIONS", () => {
    describe("vote-on-proposal()", () => {
      it("fails with ERR_PROPOSAL_NOT_ACTIVE when called before proposal is active", () => {
        // arrange
        const wallet = accounts.get("wallet_1")!;
        // act
        const receipt = chain.mineBlock([
          vote.voteOnProposal(true, wallet)
        ]).receipts[0];
        // assert
        receipt.result.expectErr().expectUint(VoteModel.ErrCode.ERR_PROPOSAL_NOT_ACTIVE);
      });
      it("fails with ERR_PROPOSAL_NOT_ACTIVE when called after proposal is active", () => {
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
      it("fails with ERR_NOTHING_STACKED when user has no stacked tokens", () => {
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
      it("succeeds with one yes vote when called by a new voter", () => {
        // arrange
        const wallet = accounts.get("wallet_1")!;
        const amountTokens = 1000;
        const lockPeriod = 5;
        const avgStacked = (amountTokens + (amountTokens * 2)) / 2;
        const scaledMia = Math.round(avgStacked * VoteModel.MIA_SCALE_FACTOR);
        const block = chain.mineBlock([
          core.testInitializeCore(core.address),
          core.unsafeSetActivationThreshold(1),
          core.registerUser(wallet),
          token.ftMint(amountTokens, wallet),
        ]);
        const activationBlockHeight =
          block.height + CoreModel.ACTIVATION_DELAY - 1;
        chain.mineEmptyBlockUntil(activationBlockHeight);
  
        // stack in cycles 2-3
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
        chain.mineBlock([
          core.stackTokens(amountTokens / 2, lockPeriod, wallet),
        ]);
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
        chain.mineBlock([
          core.stackTokens(amountTokens / 2, lockPeriod, wallet),
        ]);
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
  
        chain.mineEmptyBlockUntil(VoteModel.VOTE_START_BLOCK + 1);
  
        // act
        const receipt = chain.mineBlock([
          vote.voteOnProposal(true, wallet)
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
        const voterRecord = vote.getVoterInfo(wallet).result;
  
        // assert
        receipt.result.expectOk();
        assertEquals(proposalRecord.expectSome().expectTuple(), expectedProposalRecord);
        assertEquals(voterRecord.expectOk().expectTuple(), expectedVoterRecord);
      });
      it("succeeds with two yes votes and one no vote when called by a three new voters", () => {
        // arrange
        const wallet_1 = accounts.get("wallet_1")!;
        const wallet_2 = accounts.get("wallet_2")!;
        const wallet_3 = accounts.get("wallet_3")!;
        const amountTokens = 1000;
        const lockPeriod = 5;
        const singleVote = (amountTokens + (amountTokens * 2)) / 2;
        const singleMiaVote = Math.round(singleVote * VoteModel.MIA_SCALE_FACTOR);
        const setupBlock = chain.mineBlock([
          core.testInitializeCore(core.address),
          core.unsafeSetActivationThreshold(1),
          core.registerUser(wallet_1),
          token.ftMint(amountTokens, wallet_1),
          token.ftMint(amountTokens, wallet_2),
          token.ftMint(amountTokens, wallet_3)
        ]);
        const activationBlockHeight =
          setupBlock.height + CoreModel.ACTIVATION_DELAY - 1;
        chain.mineEmptyBlockUntil(activationBlockHeight);
  
        // stack in cycles 2-3
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
        chain.mineBlock([
          core.stackTokens(amountTokens / 2, lockPeriod, wallet_1),
          core.stackTokens(amountTokens / 2, lockPeriod, wallet_2),
          core.stackTokens(amountTokens / 2, lockPeriod, wallet_3)
        ]);
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
        chain.mineBlock([
          core.stackTokens(amountTokens / 2, lockPeriod, wallet_1),
          core.stackTokens(amountTokens / 2, lockPeriod, wallet_2),
          core.stackTokens(amountTokens / 2, lockPeriod, wallet_3)
        ]);
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
  
        chain.mineEmptyBlockUntil(VoteModel.VOTE_START_BLOCK + 1);
  
        // act
        const block = chain.mineBlock([
          vote.voteOnProposal(true, wallet_1),
          vote.voteOnProposal(true, wallet_2),
          vote.voteOnProposal(false, wallet_3),
        ]);
  
        const voterReceipt_1 = block.receipts[0];
        const voterReceipt_2 = block.receipts[1];
        const voterReceipt_3 = block.receipts[2];
  
        // set vote information to verify
        const expectedProposalRecord = {
          noCount: types.uint(1),
          noMia: types.uint(singleMiaVote),
          noNyc: types.uint(singleVote),
          noTotal: types.uint(singleMiaVote + singleVote),
          yesCount: types.uint(2),
          yesMia: types.uint(singleMiaVote * 2),
          yesNyc: types.uint(singleVote * 2),
          yesTotal: types.uint((singleMiaVote * 2) + (singleVote * 2))
        }
  
        // set voter information to verify
        const expectedVoterRecord_1 = {
          mia: types.uint(singleMiaVote),
          nyc: types.uint(singleVote),
          total: types.uint(singleMiaVote + singleVote),
          vote: types.bool(true)
        }
        const expectedVoterRecord_2 = {
          mia: types.uint(singleMiaVote),
          nyc: types.uint(singleVote),
          total: types.uint(singleMiaVote + singleVote),
          vote: types.bool(true)
        }
        const expectedVoterRecord_3 = {
          mia: types.uint(singleMiaVote),
          nyc: types.uint(singleVote),
          total: types.uint(singleMiaVote + singleVote),
          vote: types.bool(false)
        }
  
        // get records to review
        const proposalRecord = vote.getProposalVotes().result;
        const voterRecord_1 = vote.getVoterInfo(wallet_1).result;
        const voterRecord_2 = vote.getVoterInfo(wallet_2).result;
        const voterRecord_3 = vote.getVoterInfo(wallet_3).result;
  
        // assert
        voterReceipt_1.result.expectOk();
        voterReceipt_2.result.expectOk();
        voterReceipt_3.result.expectOk();
        assertEquals(proposalRecord.expectSome().expectTuple(), expectedProposalRecord);
        assertEquals(voterRecord_1.expectOk().expectTuple(), expectedVoterRecord_1);
        assertEquals(voterRecord_2.expectOk().expectTuple(), expectedVoterRecord_2);
        assertEquals(voterRecord_3.expectOk().expectTuple(), expectedVoterRecord_3);
      });
      it("fails with ERR_VOTE_ALREADY_CAST when called by an existing voter with the same vote", () => {
        // arrange
        const wallet = accounts.get("wallet_1")!;
        const amountTokens = 1000;
        const lockPeriod = 5;
        const avgStacked = (amountTokens + (amountTokens * 2)) / 2;
        const scaledMia = Math.round(avgStacked * VoteModel.MIA_SCALE_FACTOR);
        const block = chain.mineBlock([
          core.testInitializeCore(core.address),
          core.unsafeSetActivationThreshold(1),
          core.registerUser(wallet),
          token.ftMint(amountTokens, wallet),
        ]);
        const activationBlockHeight =
          block.height + CoreModel.ACTIVATION_DELAY - 1;
        chain.mineEmptyBlockUntil(activationBlockHeight);
  
        // stack in cycles 2-3
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
        chain.mineBlock([
          core.stackTokens(amountTokens / 2, lockPeriod, wallet),
        ]);
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
        chain.mineBlock([
          core.stackTokens(amountTokens / 2, lockPeriod, wallet),
        ]);
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
  
        chain.mineEmptyBlockUntil(VoteModel.VOTE_START_BLOCK + 1);
  
        // act
  
        // vote no
        chain.mineBlock([
          vote.voteOnProposal(false, wallet)
        ]);
  
        // switch vote to yes
        const receipt = chain.mineBlock([
          vote.voteOnProposal(false, wallet)
        ]).receipts[0];
  
        // assert
        receipt.result.expectErr().expectUint(VoteModel.ErrCode.ERR_VOTE_ALREADY_CAST)
      });
      it("succeeds when called by an existing voter with the a different vote", () => {
        // arrange
        const wallet = accounts.get("wallet_1")!;
        const amountTokens = 1000;
        const lockPeriod = 5;
        const avgStacked = (amountTokens + (amountTokens * 2)) / 2;
        const scaledMia = Math.round(avgStacked * VoteModel.MIA_SCALE_FACTOR);
        const block = chain.mineBlock([
          core.testInitializeCore(core.address),
          core.unsafeSetActivationThreshold(1),
          core.registerUser(wallet),
          token.ftMint(amountTokens, wallet),
        ]);
        const activationBlockHeight =
          block.height + CoreModel.ACTIVATION_DELAY - 1;
        chain.mineEmptyBlockUntil(activationBlockHeight);
  
        // stack in cycles 2-3
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
        chain.mineBlock([
          core.stackTokens(amountTokens / 2, lockPeriod, wallet),
        ]);
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
        chain.mineBlock([
          core.stackTokens(amountTokens / 2, lockPeriod, wallet),
        ]);
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
  
        chain.mineEmptyBlockUntil(VoteModel.VOTE_START_BLOCK + 1);
  
        // act
  
        // vote no
        chain.mineBlock([
          vote.voteOnProposal(false, wallet)
        ]);
  
        // switch vote to yes
        const receipt = chain.mineBlock([
          vote.voteOnProposal(true, wallet)
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
  
        // assert
        const proposalRecord = vote.getProposalVotes().result;
        const voterRecord = vote.getVoterInfo(wallet).result;
  
        // assert
        receipt.result.expectOk();
        assertEquals(proposalRecord.expectSome().expectTuple(), expectedProposalRecord);
        assertEquals(voterRecord.expectOk().expectTuple(), expectedVoterRecord);
      });
      it("succeeds with two yes votes and one no vote when called by a three existing voters that change votes", () => {
        // arrange
        const wallet_1 = accounts.get("wallet_1")!;
        const wallet_2 = accounts.get("wallet_2")!;
        const wallet_3 = accounts.get("wallet_3")!;
        const amountTokens = 1000;
        const lockPeriod = 5;
        const singleVote = (amountTokens + (amountTokens * 2)) / 2;
        const singleMiaVote = Math.round(singleVote * VoteModel.MIA_SCALE_FACTOR);
        const setupBlock = chain.mineBlock([
          core.testInitializeCore(core.address),
          core.unsafeSetActivationThreshold(1),
          core.registerUser(wallet_1),
          token.ftMint(amountTokens, wallet_1),
          token.ftMint(amountTokens, wallet_2),
          token.ftMint(amountTokens, wallet_3)
        ]);
        const activationBlockHeight =
          setupBlock.height + CoreModel.ACTIVATION_DELAY - 1;
        chain.mineEmptyBlockUntil(activationBlockHeight);
  
        // stack in cycles 2-3
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
        chain.mineBlock([
          core.stackTokens(amountTokens / 2, lockPeriod, wallet_1),
          core.stackTokens(amountTokens / 2, lockPeriod, wallet_2),
          core.stackTokens(amountTokens / 2, lockPeriod, wallet_3)
        ]);
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
        chain.mineBlock([
          core.stackTokens(amountTokens / 2, lockPeriod, wallet_1),
          core.stackTokens(amountTokens / 2, lockPeriod, wallet_2),
          core.stackTokens(amountTokens / 2, lockPeriod, wallet_3)
        ]);
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
  
        chain.mineEmptyBlockUntil(VoteModel.VOTE_START_BLOCK + 1);
  
        // act
  
        // vote the opposite way
        chain.mineBlock([
          vote.voteOnProposal(false, wallet_1),
          vote.voteOnProposal(false, wallet_2),
          vote.voteOnProposal(true, wallet_3),
        ]);
  
        // reverse the votes
        const block = chain.mineBlock([
          vote.voteOnProposal(true, wallet_1),
          vote.voteOnProposal(true, wallet_2),
          vote.voteOnProposal(false, wallet_3),
        ]);
  
        const voterReceipt_1 = block.receipts[0];
        const voterReceipt_2 = block.receipts[1];
        const voterReceipt_3 = block.receipts[2];
  
        // set vote information to verify
        const expectedProposalRecord = {
          noCount: types.uint(1),
          noMia: types.uint(singleMiaVote),
          noNyc: types.uint(singleVote),
          noTotal: types.uint(singleMiaVote + singleVote),
          yesCount: types.uint(2),
          yesMia: types.uint(singleMiaVote * 2),
          yesNyc: types.uint(singleVote * 2),
          yesTotal: types.uint((singleMiaVote * 2) + (singleVote * 2))
        }
  
        // set voter information to verify
        const expectedVoterRecord_1 = {
          mia: types.uint(singleMiaVote),
          nyc: types.uint(singleVote),
          total: types.uint(singleMiaVote + singleVote),
          vote: types.bool(true)
        }
        const expectedVoterRecord_2 = {
          mia: types.uint(singleMiaVote),
          nyc: types.uint(singleVote),
          total: types.uint(singleMiaVote + singleVote),
          vote: types.bool(true)
        }
        const expectedVoterRecord_3 = {
          mia: types.uint(singleMiaVote),
          nyc: types.uint(singleVote),
          total: types.uint(singleMiaVote + singleVote),
          vote: types.bool(false)
        }
  
        // get records to review
        const proposalRecord = vote.getProposalVotes().result;
        const voterRecord_1 = vote.getVoterInfo(wallet_1).result;
        const voterRecord_2 = vote.getVoterInfo(wallet_2).result;
        const voterRecord_3 = vote.getVoterInfo(wallet_3).result;
  
        // assert
        voterReceipt_1.result.expectOk();
        voterReceipt_2.result.expectOk();
        voterReceipt_3.result.expectOk();
        assertEquals(proposalRecord.expectSome().expectTuple(), expectedProposalRecord);
        assertEquals(voterRecord_1.expectOk().expectTuple(), expectedVoterRecord_1);
        assertEquals(voterRecord_2.expectOk().expectTuple(), expectedVoterRecord_2);
        assertEquals(voterRecord_3.expectOk().expectTuple(), expectedVoterRecord_3);
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
    });
  
    describe("get-voter()", () => {
      it("succeeds and returns none if voter not found", () => {
        // arrange
        const result = vote.getVoter(100).result;
        // assert
        result.expectNone();
      });
      it("succeeds and returns some principal if voter is found", () => {
        const wallet = accounts.get("wallet_1")!;
        const amountTokens = 1000;
        const lockPeriod = 5;
        const expectedId = 1;
        const block = chain.mineBlock([
          core.testInitializeCore(core.address),
          core.unsafeSetActivationThreshold(1),
          core.registerUser(wallet),
          token.ftMint(amountTokens, wallet),
        ]);
        const activationBlockHeight =
          block.height + CoreModel.ACTIVATION_DELAY - 1;
        chain.mineEmptyBlockUntil(activationBlockHeight);
  
        // stack in cycles 2-3
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
        chain.mineBlock([
          core.stackTokens(amountTokens / 2, lockPeriod, wallet),
        ]);
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
        chain.mineBlock([
          core.stackTokens(amountTokens / 2, lockPeriod, wallet),
        ]);
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
  
        chain.mineEmptyBlockUntil(VoteModel.VOTE_START_BLOCK + 1);
  
        // vote yes
        chain.mineBlock([
          vote.voteOnProposal(true, wallet)
        ]);
  
        const result = vote.getVoter(expectedId).result;
  
        result.expectSome().expectPrincipal(wallet.address);
      });
    })
  
    describe("get-voter-id()", () => {
      it("succeeds and returns none if voter ID not found", () => {
        // arrange
        const wallet = accounts.get("wallet_1")!;
        const result = vote.getVoterId(wallet).result;
        // assert
        result.expectNone();
      });
      it("succeeds and returns some id if voter ID is found", () => {
        const wallet = accounts.get("wallet_1")!;
        const amountTokens = 1000;
        const lockPeriod = 5;
        const expectedId = 1;
        const block = chain.mineBlock([
          core.testInitializeCore(core.address),
          core.unsafeSetActivationThreshold(1),
          core.registerUser(wallet),
          token.ftMint(amountTokens, wallet),
        ]);
        const activationBlockHeight =
          block.height + CoreModel.ACTIVATION_DELAY - 1;
        chain.mineEmptyBlockUntil(activationBlockHeight);
  
        // stack in cycles 2-3
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
        chain.mineBlock([
          core.stackTokens(amountTokens / 2, lockPeriod, wallet),
        ]);
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
        chain.mineBlock([
          core.stackTokens(amountTokens / 2, lockPeriod, wallet),
        ]);
        chain.mineEmptyBlock(CoreModel.REWARD_CYCLE_LENGTH);
  
        chain.mineEmptyBlockUntil(VoteModel.VOTE_START_BLOCK + 1);
  
        // vote yes
        chain.mineBlock([
          vote.voteOnProposal(true, wallet)
        ]);
  
        const result = vote.getVoterId(wallet).result;
  
        result.expectSome().expectUint(expectedId);
      });
    });
  
    describe("get-voter-info()", () => {
      it("fails with ERR_USER_NOT_FOUND if voter not found", () => {
        // arrange
        const wallet = accounts.get("wallet_1")!;
        const result = vote.getVoterInfo(wallet).result;
        // assert
        result.expectErr().expectUint(VoteModel.ErrCode.ERR_USER_NOT_FOUND);
      });
    });
  })
  

});

run();