import { Account, Tx, types } from "../deps.ts";
import { Client } from "./client.ts";

enum ContractState {
  STATE_DEPLOYED = 0,
  STATE_ACTIVE,
  STATE_INACTIVE,
}

enum ErrCode {
  ERR_UNKNOWN_JOB = 6000,
  ERR_UNAUTHORIZED,
  ERR_JOB_IS_ACTIVE,
  ERR_JOB_IS_NOT_ACTIVE,
  ERR_ALREADY_APPROVED,
  ERR_JOB_IS_EXECUTED,
  ERR_JOB_IS_NOT_APPROVED,
  ERR_ARGUMENT_ALREADY_EXISTS,
  ERR_NO_ACTIVE_CORE_CONTRACT,
  ERR_CORE_CONTRACT_NOT_FOUND,
}

export class AuthClient extends Client {
  static readonly ErrCode = ErrCode;
  static readonly ContractState = ContractState;

  getLastJobId() {
    return this.callReadOnlyFn("get-last-job-id");
  }

  createJob(name: string, target: string, sender: Account) {
    return Tx.contractCall(
      this.contractName,
      "create-job",
      [types.ascii(name), types.principal(target)],
      sender.address
    );
  }

  getJob(jobId: number) {
    return this.callReadOnlyFn("get-job", [types.uint(jobId)]);
  }

  activateJob(jobId: number, sender: Account) {
    return Tx.contractCall(
      this.contractName,
      "activate-job",
      [types.uint(jobId)],
      sender.address
    );
  }

  approveJob(jobId: number, approver: Account) {
    return Tx.contractCall(
      this.contractName,
      "approve-job",
      [types.uint(jobId)],
      approver.address
    );
  }

  isJobApproved(jobId: number) {
    return this.callReadOnlyFn("is-job-approved", [types.uint(jobId)]);
  }

  markJobAsExecuted(jobId: number, sender: Account) {
    return Tx.contractCall(
      this.contractName,
      "mark-job-as-executed",
      [types.uint(jobId)],
      sender.address
    );
  }

  addUIntArgument(
    jobId: number,
    argumentName: string,
    value: number,
    sender: Account
  ) {
    return Tx.contractCall(
      this.contractName,
      "add-uint-argument",
      [types.uint(jobId), types.ascii(argumentName), types.uint(value)],
      sender.address
    );
  }

  getUIntValueByName(jobId: number, argumentName: string) {
    return this.callReadOnlyFn("get-uint-value-by-name", [
      types.uint(jobId),
      types.ascii(argumentName),
    ]);
  }

  getUIntValueById(jobId: number, argumentId: number) {
    return this.callReadOnlyFn("get-uint-value-by-id", [
      types.uint(jobId),
      types.uint(argumentId),
    ]);
  }

  addPrincipalArgument(
    jobId: number,
    argumentName: string,
    value: string,
    sender: Account
  ) {
    return Tx.contractCall(
      this.contractName,
      "add-principal-argument",
      [types.uint(jobId), types.ascii(argumentName), types.principal(value)],
      sender.address
    );
  }

  getPrincipalValueByName(jobId: number, argumentName: string) {
    return this.callReadOnlyFn("get-principal-value-by-name", [
      types.uint(jobId),
      types.ascii(argumentName),
    ]);
  }

  getPrincipalValueById(jobId: number, argumentId: number) {
    return this.callReadOnlyFn("get-principal-value-by-id", [
      types.uint(jobId),
      types.uint(argumentId),
    ]);
  }

  getActiveCoreContract() {
    return this.callReadOnlyFn("get-active-core-contract");
  }

  getCoreContractInfo(targetContract: string) {
    return this.callReadOnlyFn("get-core-contract-info", [
      types.principal(targetContract),
    ]);
  }

  initializeContracts(targetContract: string, sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "initialize-contracts",
      [types.principal(targetContract)],
      sender.address
    );
  }

  activateCoreContract(
    targetContract: string,
    stacksHeight: number,
    sender: Account
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "activate-core-contract",
      [types.principal(targetContract), types.uint(stacksHeight)],
      sender.address
    );
  }

  upgradeCoreContract(
    oldContract: string,
    newContract: string,
    sender: Account
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "upgrade-core-contract",
      [types.principal(oldContract), types.principal(newContract)],
      sender.address
    );
  }

  getCityWallet() {
    return this.callReadOnlyFn("get-city-wallet");
  }

  setCityWallet(
    requestor: string,
    newCityWallet: Account,
    sender: Account
  ): Tx {
    return Tx.contractCall(
      this.contractName,
      "set-city-wallet",
      [types.principal(requestor), types.principal(newCityWallet.address)],
      sender.address
    );
  }

  testSetActiveCoreContract(sender: Account): Tx {
    return Tx.contractCall(
      this.contractName,
      "test-set-active-core-contract",
      [],
      sender.address
    );
  }
}
