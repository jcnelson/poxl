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

  describe("propose-contract()", () => {
    it("throws ERR_UNAUTHORIZED when called by non-city wallet", (chain, accounts, clients) => {
      // arrange
      const wallet = accounts.get("wallet_1")!;

      // act
      const receipt = chain.mineBlock([
        clients.core.proposeContract(
          "mining",
          clients.citycoin.getContractAddress(),
          wallet
        ),
      ]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_UNAUTHORIZED);
    });

    it("successfully saves contract and creates proposal when called by city wallet", (chain, accounts, clients) => {
      // arrange
      const cityWallet = accounts.get("wallet_1")!;
      const miningContractAddress = `${cityWallet.address}.mock`;
      chain.mineBlock([
        clients.core.unsafeSetCityWallet(cityWallet),
        Tx.deployContract("mock", "", cityWallet.address),
      ]);

      // act
      const receipt = chain.mineBlock([
        clients.core.proposeContract(
          "mining",
          miningContractAddress,
          cityWallet
        ),
      ]).receipts[0];

      // assert
      receipt.result.expectOk().expectBool(true);
      const miningContract = clients.core
        .getContract(miningContractAddress)
        .result.expectSome()
        .expectTuple();

      assertEquals(miningContract, {
        proposalId: types.uint(1),
        name: types.ascii("mining"),
      });
    });

    it("throws ERR_CONTRACT_ALREADY_EXISTS when trying to propose the same contract again", (chain, accounts, clients) => {
      // arrange
      const cityWallet = accounts.get("wallet_1")!;
      const miningContractAddress = clients.citycoin.getContractAddress();
      chain.mineBlock([
        clients.core.unsafeSetCityWallet(cityWallet),
        clients.core.proposeContract(
          "mining",
          miningContractAddress,
          cityWallet
        ),
      ]);

      // act
      const receipt = chain.mineBlock([
        clients.core.proposeContract(
          "mining",
          miningContractAddress,
          cityWallet
        ),
      ]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_CONTRACT_ALREADY_EXISTS);
    });

    it("throws ERR_CONTRACT_ALREADY_EXISTS when trying to propose contract that's been set as active during deployment", (chain, accounts, clients) => {
      // arrange
      const cityWallet = accounts.get("wallet_1")!;
      const miningContractAddress = clients.citycoin.getContractAddress();
      chain.mineBlock([clients.core.unsafeSetCityWallet(cityWallet)]);

      // act
      const receipt = chain.mineBlock([
        clients.core.proposeContract(
          "mining",
          miningContractAddress,
          cityWallet
        ),
      ]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_CONTRACT_ALREADY_EXISTS);
    });
  });

  describe("vote-on-contract()", () => {
    it("throws ERR_CONTRACT_DOES_NOT_EXIST when voted on unknown contract", (chain, accounts, clients) => {
      // arrange
      const voter = accounts.get("wallet_1")!;
      const miningContractAddress = clients.citycoin.getContractAddress();

      // act
      const receipt = chain.mineBlock([
        clients.core.voteOnContract(miningContractAddress, voter),
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
        clients.core.proposeContract(
          "mining",
          miningContractAddress,
          cityWallet
        ),
        clients.core.voteOnContract(miningContractAddress, voter),
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
        clients.core.proposeContract(
          "mining",
          miningContractAddress,
          cityWallet
        ),
      ]);
      //move chain tip to the first block after voting period
      chain.mineEmptyBlockUntil(
        addContractBlock.height + CoreClient.DEFAULT_VOTING_PERIOD + 1
      );

      //act
      const receipt = chain.mineBlock([
        clients.core.voteOnContract(miningContractAddress, voter),
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
        clients.core.proposeContract(
          "mining",
          miningContractAddress,
          cityWallet
        ),
      ]);

      // act
      const receipt = chain.mineBlock([
        clients.core.voteOnContract(miningContractAddress, voter),
      ]).receipts[0];

      // assert
      receipt.result.expectOk().expectBool(true);
      const proposal = clients.core
        .getProposal(1)
        .result.expectSome()
        .expectTuple();

      const expectedProposal = clients.core.createProposalTuple({
        contractAddress: miningContractAddress,
        startBH: addContractBlock.height,
        endBH: addContractBlock.height + CoreClient.DEFAULT_VOTING_PERIOD,
        miners: 1,
        votes: 1,
        isOpen: true,
      });

      assertEquals(proposal, expectedProposal);
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
        clients.core.proposeContract(
          "mining",
          miningContractAddress,
          cityWallet
        ),
      ]);

      // act
      const block = chain.mineBlock([
        clients.core.voteOnContract(miningContractAddress, voter1),
        clients.core.voteOnContract(miningContractAddress, voter2),
      ]);

      // assert
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectOk().expectBool(true);
      const proposal = clients.core
        .getProposal(1)
        .result.expectSome()
        .expectTuple();

      const expectedProposal = clients.core.createProposalTuple({
        contractAddress: miningContractAddress,
        startBH: addContractBlock.height,
        endBH: addContractBlock.height + CoreClient.DEFAULT_VOTING_PERIOD,
        miners: 2,
        votes: 2,
        isOpen: true,
      });

      assertEquals(proposal, expectedProposal);
    });

    it("throws ERR_ALREADY_VOTED when voter submit multiple votes", (chain, accounts, clients) => {
      // arrange
      const voter = accounts.get("wallet_1")!;
      const cityWallet = accounts.get("wallet_2")!;
      const miningContractAddress = `${cityWallet.address}.mock`;
      const addContractBlock = chain.mineBlock([
        clients.core.unsafeSetCityWallet(cityWallet),
        Tx.deployContract("mock", "", cityWallet.address),
        clients.core.proposeContract(
          "mining",
          miningContractAddress,
          cityWallet
        ),
      ]);
      chain.mineBlock([
        clients.core.voteOnContract(miningContractAddress, voter),
      ]);

      // act
      const receipt = chain.mineBlock([
        clients.core.voteOnContract(miningContractAddress, voter),
      ]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_ALREADY_VOTED);
      const proposal = clients.core
        .getProposal(1)
        .result.expectSome()
        .expectTuple();

      const expectedProposal = clients.core.createProposalTuple({
        contractAddress: miningContractAddress,
        startBH: addContractBlock.height,
        endBH: addContractBlock.height + CoreClient.DEFAULT_VOTING_PERIOD,
        miners: 1,
        votes: 1,
        isOpen: true,
      });

      assertEquals(proposal, expectedProposal);
    });
  });

  describe("close-proposal()", () => {
    it("throws ERR_PROPOSAL_DOES_NOT_EXIST if tried to close unknown proposal", (chain, accounts, clients) => {
      // arrange
      const sender = accounts.get("wallet_1")!;

      // act
      const receipt = chain.mineBlock([clients.core.closeProposal(1, sender)])
        .receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_PROPOSAL_DOES_NOT_EXIST);
    });

    it("throws ERR_VOTE_STILL_IN_PROGRESS if called before voting period ends", (chain, accounts, clients) => {
      // arrange
      const sender = accounts.get("wallet_1")!;
      const cityWallet = accounts.get("wallet_2")!;
      const miningContractAddress = `${cityWallet.address}.mock`;
      chain.mineBlock([
        clients.core.unsafeSetCityWallet(cityWallet),
        Tx.deployContract("mock", "", cityWallet.address),
        clients.core.proposeContract(
          "mining",
          miningContractAddress,
          cityWallet
        ),
      ]);

      // act
      const receipt = chain.mineBlock([clients.core.closeProposal(1, sender)])
        .receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_VOTE_STILL_IN_PROGRESS);
    });

    it("mark proposal as closed if it has less than 90% votes", (chain, accounts, clients) => {
      // arrange
      const sender = accounts.get("wallet_1")!;
      const cityWallet = accounts.get("wallet_2")!;
      const miningContractAddress = `${cityWallet.address}.mock`;
      const addContractBlock = chain.mineBlock([
        clients.core.unsafeSetCityWallet(cityWallet),
        Tx.deployContract("mock", "", cityWallet.address),
        clients.core.proposeContract(
          "mining",
          miningContractAddress,
          cityWallet
        ),
      ]);
      chain.mineEmptyBlockUntil(
        addContractBlock.height + CoreClient.DEFAULT_VOTING_PERIOD + 1
      );

      // act
      const receipt = chain.mineBlock([clients.core.closeProposal(1, sender)])
        .receipts[0];
      const contract = clients.core
        .getContract(miningContractAddress)
        .result.expectSome()
        .expectTuple();

      // assert
      receipt.result.expectOk().expectBool(true);
      const expectedProposal = clients.core.createProposalTuple({
        contractAddress: miningContractAddress,
        startBH: addContractBlock.height,
        endBH: addContractBlock.height + CoreClient.DEFAULT_VOTING_PERIOD,
        miners: 0,
        votes: 0,
        isOpen: false,
      });
      const proposal = clients.core
        .getProposal(1)
        .result.expectSome()
        .expectTuple();
      assertEquals(proposal, expectedProposal);
    });

    it("mark contract as active and proposal as closed if got at least 90% votes", (chain, accounts, clients) => {
      // arrange
      const sender = accounts.get("wallet_1")!;
      const cityWallet = accounts.get("wallet_2")!;
      const voter = accounts.get("wallet_3")!;
      const miningContractAddress = `${cityWallet.address}.mock`;
      const addContractBlock = chain.mineBlock([
        clients.core.unsafeSetCityWallet(cityWallet),
        Tx.deployContract("mock", "", cityWallet.address),
        clients.core.proposeContract(
          "mining",
          miningContractAddress,
          cityWallet
        ),
      ]);
      chain.mineBlock([
        clients.core.voteOnContract(miningContractAddress, voter),
      ]);
      chain.mineEmptyBlockUntil(
        addContractBlock.height + CoreClient.DEFAULT_VOTING_PERIOD + 1
      );

      // act
      const receipt = chain.mineBlock([clients.core.closeProposal(1, sender)])
        .receipts[0];
      const contract = clients.core
        .getContract(miningContractAddress)
        .result.expectSome()
        .expectTuple();

      // assert
      receipt.result.expectOk().expectBool(true);

      clients.core
        .getActiveContract("mining")
        .result.expectSome()
        .expectPrincipal(miningContractAddress);

      const expectedProposal = clients.core.createProposalTuple({
        contractAddress: miningContractAddress,
        startBH: addContractBlock.height,
        endBH: addContractBlock.height + CoreClient.DEFAULT_VOTING_PERIOD,
        miners: 1,
        votes: 1,
        isOpen: false,
      });
      const proposal = clients.core
        .getProposal(1)
        .result.expectSome()
        .expectTuple();
      assertEquals(proposal, expectedProposal);
    });
  });
});
