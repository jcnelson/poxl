import { Account, Tx, types } from "../deps.ts";
import { Client } from "./client.ts";

export class TestUtilsClient extends Client {
  testWalletAttack(sender: Account) {
    return Tx.contractCall(
      this.contractName,
      "test-wallet-attack",
      [],
      sender.address
    );
  }

  testWalletAttackAsContract(sender: Account) {
    return Tx.contractCall(
      this.contractName,
      "test-wallet-attack-as-contract",
      [],
      sender.address
    );
  }
}
