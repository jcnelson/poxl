import { assertEquals, describe, Tx, types } from "../deps.ts";
import { CoreClient } from "../src/core-client.ts";
import { it } from "../src/testutil.ts";

describe("[CityCoin Core]", () => {
  describe("set-city-wallet()", () => {
    it("throws ERR_UNAUTHORIZED when called by non-city wallet", (chain, accounts, clients) => {
      // arrange
      const wallet = accounts.get("wallet_1")!;

      // act
      const receipt = chain.mineBlock([
        clients.core.setCityWallet(wallet, wallet),
      ]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_UNAUTHORIZED);
    });

    it("successfully change city walled when called by current city wallet", (chain, accounts, clients) => {
      // arrange
      const cityWallet = accounts.get("wallet_1")!;
      const newCityWallet = accounts.get("wallet_2")!;
      chain.mineBlock([clients.core.unsafeSetCityWallet(cityWallet)]);

      // act
      const receipt = chain.mineBlock([
        clients.core.setCityWallet(newCityWallet, cityWallet),
      ]).receipts[0];

      // assert
      receipt.result.expectOk().expectBool(true);
      clients.core
        .getCityWallet()
        .result.expectPrincipal(newCityWallet.address);
    });
  });

  describe("add-mining-contract()", () => {
    it("throws ERR_UNAUTHORIZED when called by non-city wallet", (chain, accounts, clients) => {
      // arrange
      const wallet = accounts.get("wallet_1")!;

      // act
      const receipt = chain.mineBlock([
        clients.core.addMiningContract(
          clients.citycoin.getContractAddress(),
          wallet
        ),
      ]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_UNAUTHORIZED);
    });

    it("successfully saves contract with state = STATE_DEFINED when called by city wallet", (chain, accounts, clients) => {
      // arrange
      const cityWallet = accounts.get("wallet_1")!;
      const miningContractAddress = `${cityWallet.address}.mock`;
      chain.mineBlock([
        clients.core.unsafeSetCityWallet(cityWallet),
        Tx.deployContract("mock", "", cityWallet.address),
      ]);

      // act
      const receipt = chain.mineBlock([
        clients.core.addMiningContract(miningContractAddress, cityWallet),
      ]).receipts[0];

      // assert
      receipt.result.expectOk().expectBool(true);
      const miningContract = clients.core
        .getMiningContract(miningContractAddress)
        .result.expectSome()
        .expectTuple();

      assertEquals(miningContract, {
        id: types.uint(1),
        state: types.uint(CoreClient.ContractState.STATE_DEFINED),
      });
    });

    it("throws ERR_CONTRACT_ALREADY_EXISTS when trying to add the same contract again", (chain, accounts, clients) => {
      // arrange
      const cityWallet = accounts.get("wallet_1")!;
      const miningContractAddress = clients.citycoin.getContractAddress();
      chain.mineBlock([
        clients.core.unsafeSetCityWallet(cityWallet),
        clients.core.addMiningContract(miningContractAddress, cityWallet),
      ]);

      // act
      const receipt = chain.mineBlock([
        clients.core.addMiningContract(miningContractAddress, cityWallet),
      ]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_CONTRACT_ALREADY_EXISTS);
    });

    it("throws ERR_CONTRACT_ALREADY_EXISTS when trying to add contract that's been set as active during deployment", (chain, accounts, clients) => {
      // arrange
      const cityWallet = accounts.get("wallet_1")!;
      const miningContractAddress = clients.citycoin.getContractAddress();
      chain.mineBlock([clients.core.unsafeSetCityWallet(cityWallet)]);

      // act
      const receipt = chain.mineBlock([
        clients.core.addMiningContract(miningContractAddress, cityWallet),
      ]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_CONTRACT_ALREADY_EXISTS);
    });
  });

  describe("vote-on-mining-contract()", () => {
    it("throws ERR_CONTRACT_DOES_NOT_EXIST when voted on unknown contract", (chain, accounts, clients) => {
      // arrange
      const voter = accounts.get("wallet_1")!;
      const miningContractAddress = clients.citycoin.getContractAddress();

      // act
      const receipt = chain.mineBlock([
        clients.core.voteOnMiningContract(miningContractAddress, voter),
      ]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_CONTRACT_DOES_NOT_EXIST);
    });

    it("throws ERR_VOTE_HAS_ENDED when voted in the same block as adding contract", (chain, accounts, clients) => {
      // arrange
      const voter = accounts.get("wallet_1")!;
      const cityWallet = accounts.get("wallet_2")!;
      const miningContractAddress = `${cityWallet.address}.mock`;
      chain.mineBlock([
        clients.core.unsafeSetCityWallet(cityWallet),
        Tx.deployContract("mock", "", cityWallet.address),
      ]);

      //act
      const receipt = chain.mineBlock([
        clients.core.addMiningContract(miningContractAddress, cityWallet),
        clients.core.voteOnMiningContract(miningContractAddress, voter),
      ]).receipts[1];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_VOTE_HAS_ENDED);
    });

    it("throws ERR_VOTE_HAS_ENDED when voted after voting period", (chain, accounts, clients) => {
      // arrange
      const voter = accounts.get("wallet_1")!;
      const cityWallet = accounts.get("wallet_2")!;
      const miningContractAddress = `${cityWallet.address}.mock`;
      const addContractBlock = chain.mineBlock([
        clients.core.unsafeSetCityWallet(cityWallet),
        Tx.deployContract("mock", "", cityWallet.address),
        clients.core.addMiningContract(miningContractAddress, cityWallet),
      ]);
      //move chain tip to the first block after voting period
      chain.mineEmptyBlockUntil(
        addContractBlock.height + CoreClient.DEFAULT_VOTING_PERIOD + 1
      );

      //act
      const receipt = chain.mineBlock([
        clients.core.voteOnMiningContract(miningContractAddress, voter),
      ]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_VOTE_HAS_ENDED);
    });

    it("successfully save vote when voted on existing contract", (chain, accounts, clients) => {
      // arrange
      const voter = accounts.get("wallet_1")!;
      const cityWallet = accounts.get("wallet_2")!;
      const miningContractAddress = `${cityWallet.address}.mock`;
      const addContractBlock = chain.mineBlock([
        clients.core.unsafeSetCityWallet(cityWallet),
        Tx.deployContract("mock", "", cityWallet.address),
        clients.core.addMiningContract(miningContractAddress, cityWallet),
      ]);

      // act
      const receipt = chain.mineBlock([
        clients.core.voteOnMiningContract(miningContractAddress, voter),
      ]).receipts[0];

      // assert
      receipt.result.expectOk().expectBool(true);
      const contractVote = clients.core
        .getMiningContractVote(1)
        .result.expectSome()
        .expectTuple();

      const expectedVote = clients.core.createVoteTuple(
        miningContractAddress,
        addContractBlock.height,
        addContractBlock.height + CoreClient.DEFAULT_VOTING_PERIOD,
        1,
        1
      );

      assertEquals(contractVote, expectedVote);
    });

    it("successfully save votes from multiple voters when voted on existing contract", (chain, accounts, clients) => {
      // arrange
      const voter1 = accounts.get("wallet_1")!;
      const voter2 = accounts.get("wallet_2")!;
      const cityWallet = accounts.get("wallet_3")!;
      const miningContractAddress = `${cityWallet.address}.mock`;
      const addContractBlock = chain.mineBlock([
        clients.core.unsafeSetCityWallet(cityWallet),
        Tx.deployContract("mock", "", cityWallet.address),
        clients.core.addMiningContract(miningContractAddress, cityWallet),
      ]);

      // act
      const block = chain.mineBlock([
        clients.core.voteOnMiningContract(miningContractAddress, voter1),
        clients.core.voteOnMiningContract(miningContractAddress, voter2),
      ]);

      // assert
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectOk().expectBool(true);
      const contractVote = clients.core
        .getMiningContractVote(1)
        .result.expectSome()
        .expectTuple();

      const expectedVote = clients.core.createVoteTuple(
        miningContractAddress,
        addContractBlock.height,
        addContractBlock.height + CoreClient.DEFAULT_VOTING_PERIOD,
        2,
        2
      );

      assertEquals(contractVote, expectedVote);
    });

    it("throws ERR_ALREADY_VOTED when voter submit multiple votes", (chain, accounts, clients) => {
      // arrange
      const voter = accounts.get("wallet_1")!;
      const cityWallet = accounts.get("wallet_2")!;
      const miningContractAddress = `${cityWallet.address}.mock`;
      const addContractBlock = chain.mineBlock([
        clients.core.unsafeSetCityWallet(cityWallet),
        Tx.deployContract("mock", "", cityWallet.address),
        clients.core.addMiningContract(miningContractAddress, cityWallet),
      ]);
      chain.mineBlock([
        clients.core.voteOnMiningContract(miningContractAddress, voter),
      ]);

      // act
      const receipt = chain.mineBlock([
        clients.core.voteOnMiningContract(miningContractAddress, voter),
      ]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_ALREADY_VOTED);
      const contractVote = clients.core
        .getMiningContractVote(1)
        .result.expectSome()
        .expectTuple();

      const expectedVote = clients.core.createVoteTuple(
        miningContractAddress,
        addContractBlock.height,
        addContractBlock.height + CoreClient.DEFAULT_VOTING_PERIOD,
        1,
        1
      );

      assertEquals(contractVote, expectedVote);
    });
  });

  describe("end-mining-contract-vote", () => {
    it("throws ERR_CONTRACT_DOES_NOT_EXIST if called for unknown contract", (chain, accounts, clients) => {
      // arrange
      const sender = accounts.get("wallet_1")!;

      // act
      const receipt = chain.mineBlock([
        clients.core.closeMiningContractVote(1, sender),
      ]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_CONTRACT_DOES_NOT_EXIST);
    });

    it("throws ERR_VOTE_STILL_IN_PROGRESS if called before voting period ends", (chain, accounts, clients) => {
      // arrange
      const sender = accounts.get("wallet_1")!;
      const cityWallet = accounts.get("wallet_2")!;
      const miningContractAddress = `${cityWallet.address}.mock`;
      chain.mineBlock([
        clients.core.unsafeSetCityWallet(cityWallet),
        Tx.deployContract("mock", "", cityWallet.address),
        clients.core.addMiningContract(miningContractAddress, cityWallet),
      ]);

      // act
      const receipt = chain.mineBlock([
        clients.core.closeMiningContractVote(1, sender),
      ]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_VOTE_STILL_IN_PROGRESS);
    });

    it("set STATE_FAIL state if contract didn't get at least 90% votes", (chain, accounts, clients) => {
      // arrange
      const sender = accounts.get("wallet_1")!;
      const cityWallet = accounts.get("wallet_2")!;
      const miningContractAddress = `${cityWallet.address}.mock`;
      const addContractBlock = chain.mineBlock([
        clients.core.unsafeSetCityWallet(cityWallet),
        Tx.deployContract("mock", "", cityWallet.address),
        clients.core.addMiningContract(miningContractAddress, cityWallet),
      ]);
      chain.mineEmptyBlockUntil(
        addContractBlock.height + CoreClient.DEFAULT_VOTING_PERIOD + 1
      );

      // act
      const receipt = chain.mineBlock([
        clients.core.closeMiningContractVote(1, sender),
      ]).receipts[0];
      const contract = clients.core
        .getMiningContract(miningContractAddress)
        .result.expectSome()
        .expectTuple();

      // assert
      receipt.result.expectOk().expectBool(true);

      const expectedContract = {
        id: types.uint(1),
        state: types.uint(CoreClient.ContractState.STATE_FAILED),
      };
      assertEquals(contract, expectedContract);
    });

    it("set STATE_ACTIVE state if contract got at least 90% votes", (chain, accounts, clients) => {
      // arrange
      const sender = accounts.get("wallet_1")!;
      const cityWallet = accounts.get("wallet_2")!;
      const voter = accounts.get("wallet_3")!;
      const miningContractAddress = `${cityWallet.address}.mock`;
      const addContractBlock = chain.mineBlock([
        clients.core.unsafeSetCityWallet(cityWallet),
        Tx.deployContract("mock", "", cityWallet.address),
        clients.core.addMiningContract(miningContractAddress, cityWallet),
      ]);
      chain.mineBlock([
        clients.core.voteOnMiningContract(miningContractAddress, voter),
      ]);
      chain.mineEmptyBlockUntil(
        addContractBlock.height + CoreClient.DEFAULT_VOTING_PERIOD + 1
      );

      // act
      const receipt = chain.mineBlock([
        clients.core.closeMiningContractVote(1, sender),
      ]).receipts[0];
      const contract = clients.core
        .getMiningContract(miningContractAddress)
        .result.expectSome()
        .expectTuple();

      // assert
      receipt.result.expectOk().expectBool(true);

      const expectedContract = {
        id: types.uint(1),
        state: types.uint(CoreClient.ContractState.STATE_ACTIVE),
      };
      assertEquals(contract, expectedContract);

      clients.core
        .getActiveMiningContract()
        .result.expectPrincipal(miningContractAddress);
    });
  });
});
