(define-constant CONTRACT_OWNER tx-sender)

(define-constant ERR_UNAUTHORIZED u1000)
(define-constant ERR_CONTRACT_ALREADY_EXISTS u1001)
(define-constant ERR_CONTRACT_DOES_NOT_EXIST u1002)
(define-constant ERR_VOTE_HAS_ENDED u1003)
(define-constant ERR_VOTE_STILL_IN_PROGRESS u1004)
(define-constant ERR_ALREADY_VOTED u1005)
(define-constant ERR_PROPOSAL_DOES_NOT_EXIST u1006)
(define-constant ERR_PROPOSAL_ALREADY_CLOSED u1007)
(define-constant ERR_NOTHING_TO_VOTE_ON u1008)
(define-constant ERR_CANT_VOTE_ON_OLD_PROPOSAL u1009)

;; TODO: think about replacing with buff
(define-constant STATE_DEFINED u0)
(define-constant STATE_STARTED u1)
(define-constant STATE_LOCKED_IN u2)
(define-constant STATE_ACTIVE u3)
(define-constant STATE_FAILED u4)

(define-constant DEFAULT_VOTING_PERIOD u200)
(define-constant DEFAULT_VOTING_THRESHOLD u90)

(define-data-var cityWallet principal 'ST31270FK25JBGCRWYT7RNK90E946R8VW6SZYSQR6)

(define-map ActiveContracts
  (string-ascii 100) ;; name ie. "mining", "stacking", "vrf" etc.
  principal          ;; address
)

;; used as Proposal ID
(define-data-var proposalNonce uint u0)

(define-map Contracts
  principal  ;; MiningContract address
  { proposalId: uint, name: (string-ascii 100) }
)

(define-map Proposals
  uint ;; Proposal id
  {
    address: principal,
    startBH: uint,
    endBH: uint,
    voters: uint,
    votes: uint,
    isOpen: bool
  }
)

;; check
(define-map ProposalVoters
  { proposalId: uint, voter: principal }
  bool
)

(define-read-only (get-proposals-count)
  (var-get proposalNonce)
)

(define-read-only (has-voted-on-proposal (proposalId uint) (who principal))
  (is-some (map-get? ProposalVoters
    { proposalId: proposalId, voter: who }
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

;; Returns proposal ID and name under which the contract was added
(define-read-only (get-contract (address principal))
  (map-get? Contracts address)
)

;; Allows to propose new contract that users will vote on if they want to activate it or not.
(define-public (propose-contract (name (string-ascii 100)) (address principal))
  (let
    (
      (newNonce (+ (var-get proposalNonce) u1))
    )
    (asserts! (is-authorized) (err ERR_UNAUTHORIZED))
    (asserts! (not (is-eq (get-active-contract name) (some address))) (err ERR_CONTRACT_ALREADY_EXISTS))
    (asserts! (is-none (get-contract address)) (err ERR_CONTRACT_ALREADY_EXISTS))
    
    (var-set proposalNonce newNonce)
    (map-set Proposals 
      newNonce
      {
        address: address,
        startBH: (+ block-height u1),
        endBH: (+ block-height u1 DEFAULT_VOTING_PERIOD),
        voters: u0,
        votes: u0,
        isOpen: true
      }
    )
    (map-set Contracts address { proposalId: newNonce, name: name } )
    (ok true)
  )
)

;; Returns all informations about proposal
(define-read-only (get-proposal (id uint))
  (map-get? Proposals id)
)

;; Allows to vote on specific proposal
(define-public (vote (proposalId (optional uint)))
  (let
    (
      (lastProposalId (var-get proposalNonce))
      (proposal (unwrap! (get-proposal lastProposalId) (err ERR_NOTHING_TO_VOTE_ON)))
      (providedLastProposalId (is-eq lastProposalId (default-to u0 proposalId)))
    )
    (asserts! (or (is-none proposalId) providedLastProposalId) 
      (err ERR_CANT_VOTE_ON_OLD_PROPOSAL))

    (asserts! (is-between block-height (get startBH proposal) (get endBH proposal)) 
      (err ERR_VOTE_HAS_ENDED))

    (asserts! (not (has-voted-on-proposal lastProposalId contract-caller))
      (err ERR_ALREADY_VOTED))

    (map-set Proposals
      lastProposalId
      (merge proposal 
        { 
          votes: (if providedLastProposalId (+ (get votes proposal) u1) (get votes proposal)),
          voters: (+ (get voters proposal) u1)
        } 
      )
    )
    (map-set ProposalVoters
      { proposalId: lastProposalId, voter: contract-caller }
      true
    )
    (ok true)
  )
)

(define-public (close-proposal (id uint))
  (let
    (
      (proposal (unwrap! (get-proposal id) (err ERR_PROPOSAL_DOES_NOT_EXIST)))
    )
    (asserts! (> block-height (get endBH proposal)) (err ERR_VOTE_STILL_IN_PROGRESS))
    (asserts! (get isOpen proposal) (err ERR_PROPOSAL_ALREADY_CLOSED))
    ;; close proposal
    (map-set Proposals id (merge proposal { isOpen: false }))

    ;; 
    (if (or (is-eq u0 (get voters proposal))
        (< (/ (* (get votes proposal) u100) (get voters proposal)) DEFAULT_VOTING_THRESHOLD))
      (ok true) ;; the vote has been lost
      (activate-contract (get address proposal))
    )
  )
)

(define-read-only (get-active-contract (name (string-ascii 100)))
  (map-get? ActiveContracts name)
)

(define-private (activate-contract (address principal))
  (let
    (
      (contract (unwrap! (get-contract address) (err ERR_CONTRACT_DOES_NOT_EXIST)))
    )
    (map-set ActiveContracts
      (get name contract)
      address
    )   
    ;; call somehow startup
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

;; Initialize
(map-set ActiveContracts "logic" .citycoin-logic-v1)

;; unsafe functions used only during tests
(define-public (unsafe-set-city-wallet (newCityWallet principal))
  (ok (var-set cityWallet newCityWallet))
)