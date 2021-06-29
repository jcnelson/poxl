import { Account, ReadOnlyFn, Tx, types } from "../deps.ts";
import { Client } from "./client.ts";

enum ErrCode {
  ERR_UNAUTHORIZED = 3,
}

export class TokenClient extends Client {
  static readonly ErrCode = ErrCode;

  /**
   * Mints token to make testing easier.
   *
   * @param amount
   * @param recipient
   */
  ftMint(amount: number, recipient: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "ft-mint",
      [types.uint(amount), types.principal(recipient.address)],
      this.deployer.address
    );
  }

  // SIP-010 functions
  transfer(
    amount: number,
    from: Account,
    to: Account,
    sender: Account,
    memo: ArrayBuffer | undefined = undefined
  ): Tx {
    let memoVal: string;

    if (typeof memo == "undefined") {
      memoVal = types.none();
    } else {
      memoVal = types.some(types.buff(memo));
    }

    return Tx.contractCall(
      this.contractName,
      "transfer",
      [
        types.uint(amount),
        types.principal(from.address),
        types.principal(to.address),
        memoVal,
      ],
      sender.address
    );
  }

  getName(): ReadOnlyFn {
    return this.callReadOnlyFn("get-name");
  }

  getSymbol(): ReadOnlyFn {
    return this.callReadOnlyFn("get-symbol");
  }

  getDecimals(): ReadOnlyFn {
    return this.callReadOnlyFn("get-decimals");
  }

  getBalance(user: Account): ReadOnlyFn {
    return this.callReadOnlyFn("get-balance", [types.principal(user.address)]);
  }

  getTotalSupply(): ReadOnlyFn {
    return this.callReadOnlyFn("get-total-supply");
  }

  getTokenUri(): ReadOnlyFn {
    return this.callReadOnlyFn("get-token-uri");
  }

  setTokenUri(sender: Account, newUri?: string | undefined): Tx {
    let newUriVal: string;

    if (typeof newUri == "undefined") {
      newUriVal = types.none();
    } else {
      newUriVal = types.some(types.utf8(newUri));
    }

    return Tx.contractCall(
      this.contractName,
      "set-token-uri",
      [newUriVal],
      sender.address
    );
  }

  isTrustedCaller(caller: Account): ReadOnlyFn {
    return this.callReadOnlyFn("is-trusted-caller", [
      types.principal(caller.address),
    ]);
  }

  addTrustedCaller(caller: Account, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "add-trusted-caller",
      [types.principal(caller.address)],
      sender.address
    );
  }

  removeTrustedCaller(caller: Account, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "remove-trusted-caller",
      [types.principal(caller.address)],
      sender.address
    );
  }

  mint(amount: number, recipient: Account, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "mint",
      [types.uint(amount), types.principal(recipient.address)],
      sender.address
    );
  }
}
