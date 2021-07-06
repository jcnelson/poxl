(define-constant CONTRACT_OWNER tx-sender)

(define-constant ERR_UNAUTHORIZED u1000)
(define-constant ERR_CONTRACT_ALREADY_EXISTS u1001)
(define-constant ERR_CONTRACT_DOES_NOT_EXIST u1002)
(define-constant ERR_VOTE_HAS_ENDED u1003)
(define-constant ERR_VOTE_STILL_IN_PROGRESS u1004)
(define-constant ERR_ALREADY_VOTED u1005)

;; TODO: think about replacing with buff
(define-constant STATE_DEFINED u0)
(define-constant STATE_STARTED u1)
(define-constant STATE_LOCKED_IN u2)
(define-constant STATE_ACTIVE u3)
(define-constant STATE_FAILED u4)

(define-constant DEFAULT_VOTING_PERIOD u200)
(define-constant DEFAULT_VOTING_THRESHOLD u90)

(define-data-var cityWallet principal 'ST31270FK25JBGCRWYT7RNK90E946R8VW6SZYSQR6)

(define-data-var activeMiningContract principal .citycoin)

;; used as MiningContract ID and key in Voting map.
(define-data-var miningContractNonce uint u0)

(define-map MiningContracts
  principal  ;; MiningContract address
  { id: uint, state: uint }
)

(define-map MiningContractVotes
  uint ;; MiningContract id
  {
    address: principal,
    startBH: uint,
    endBH: uint,
    miners: uint,
    votes: uint
  }
)

(define-map MiningCandidateVoters
  { contract: principal, voter: principal }
  bool
)

(define-read-only (has-voted-on-candidate (contract principal))
  (is-some (map-get? MiningCandidateVoters
    { contract: contract, voter: contract-caller }
  ))
)

(define-read-only (get-city-wallet)
  (var-get cityWallet)
)

(define-public (set-city-wallet (newCityWallet principal))
  (begin
    (asserts! (is-authorized) (err ERR_UNAUTHORIZED))
    (ok (var-set cityWallet newCityWallet))
  )
)

(define-read-only (get-mining-contract (address principal))
  (map-get? MiningContracts address)
)

(define-public (add-mining-contract (address principal))
  (let
    (
      (newNonce (+ (var-get miningContractNonce) u1))
    )
    (asserts! (is-authorized) (err ERR_UNAUTHORIZED))
    (asserts! (not (is-eq (get-active-mining-contract) address)) (err ERR_CONTRACT_ALREADY_EXISTS))
    (asserts! (is-none (get-mining-contract address)) (err ERR_CONTRACT_ALREADY_EXISTS))
    
    (var-set miningContractNonce newNonce)
    (map-set MiningContractVotes 
      newNonce
      {
        address: address,
        startBH: (+ block-height u1),
        endBH: (+ block-height u1 DEFAULT_VOTING_PERIOD),
        miners: u0,
        votes: u0
      }
    )
    (ok (map-set MiningContracts address { id: newNonce, state: STATE_DEFINED } ))
  )
)

(define-read-only (get-mining-contract-vote (contractId uint))
  (map-get? MiningContractVotes contractId)
)

(define-public (vote-on-mining-contract (contract principal))
  (let
    (
      (contractId (get id (unwrap! (get-mining-contract contract) (err ERR_CONTRACT_DOES_NOT_EXIST))))
      (contractVote (unwrap-panic (get-mining-contract-vote contractId)))
    )
    (asserts! (is-between block-height (get startBH contractVote) (get endBH contractVote)) 
      (err ERR_VOTE_HAS_ENDED))
    (asserts! (not (has-voted-on-candidate contract))
      (err ERR_ALREADY_VOTED))
    (map-set MiningContractVotes
      contractId
      (merge contractVote 
        { 
          votes: (+ (get votes contractVote) u1),
          miners: (+ (get miners contractVote) u1)
        } 
      )
    )
    (map-set MiningCandidateVoters
      { contract: contract, voter: contract-caller }
      true
    )
    (ok true)
  )
)

(define-public (close-mining-contract-vote (contractId uint))
  (let
    (
      (contractVote (unwrap! (get-mining-contract-vote contractId) (err ERR_CONTRACT_DOES_NOT_EXIST)))
    )
    (asserts! (> block-height (get endBH contractVote)) (err ERR_VOTE_STILL_IN_PROGRESS))
    
    (if (or (is-eq u0 (get miners contractVote))
        (< (/ (* (get votes contractVote) u100) (get miners contractVote)) DEFAULT_VOTING_THRESHOLD))
      (fail-contract (get address contractVote))
      (activate-contract (get address contractVote))
    )
  )
)

(define-read-only (get-active-mining-contract)
  (var-get activeMiningContract)
)

(define-private (activate-contract (address principal))
  (let
    (
      (contract (unwrap! (get-mining-contract address) (err ERR_CONTRACT_DOES_NOT_EXIST)))
    )
    (var-set activeMiningContract address)
    (map-set MiningContracts 
      address 
      (merge contract { state: STATE_ACTIVE })
    )
    (ok true)
  )
)

(define-private (fail-contract (address principal))
  (let
    (
      (contract (unwrap! (get-mining-contract address) (err ERR_CONTRACT_DOES_NOT_EXIST)))
    )
    (map-set MiningContracts 
      address 
      (merge contract { state: STATE_FAILED })
    )
    (ok true)
  )
)

;; --------------------
(define-private (is-authorized)
  (is-eq contract-caller (var-get cityWallet))
)

;; helper function
(define-read-only (is-between (value uint) (low uint) (high uint))
  (and 
    (>= value low)
    (<= value high)
  )
)
