;; CityCoins Vote V1
;; A voting mechanism inspired by SIP-012 for Stacks,
;; defined in CCIP-011 and used to vote on ratifying
;; CCIP-008, CCIP-009, and CCIP-010.

;; ERRORS

(define-constant ERR_USER_NOT_FOUND (err u8000))
(define-constant ERR_STACKER_NOT_FOUND (err u8001))
(define-constant ERR_PROPOSAL_NOT_FOUND (err u8002))
(define-constant ERR_PROPOSAL_NOT_ACTIVE (err u8003))
(define-constant ERR_VOTE_ALREADY_RECORDED (err u8004))

;; PROPOSALS

(define-constant CCIP-008 {
  name: "CityCoins SIP-010 Token v2",
  link: "TODO",
  hash: "TODO"
})

(define-constant CCIP-009 {
  name: "CityCoins VRF v2",
  link: "TODO",
  hash: "TODO"
})

(define-constant CCIP-010 {
  name: "CityCoins Auth v2",
  link: "TODO",
  hash: "TODO"
})

;; TODO: update block heights
(define-constant VOTE_START_BLOCK u0)
(define-constant VOTE_END_BLOCK u0)
(define-constant VOTE_PROPOSAL_KEY u0)
(define-constant VOTE_SCALE_FACTOR u1000000000)

;; define constants for total supply
;; and for the MIA scale factor?

(define-map ProposalVotes
  uint ;; proposalId
  {
    yesCount: uint,
    yesMia: uint,
    yesNyc: uint,
    yesTotal: uint,
    noCount: uint,
    noMia: uint,
    noNyc: uint,
    noTotal: uint
  }
)

;; VOTERS

(define-data-var voterIndex uint u0)

(define-map Voters
  uint
  principal
)

(define-map VoterIds
  principal
  uint
)

(define-map Votes
  uint ;; voter ID
  {
    vote: bool,
    mia: uint,
    nyc: uint,
    total: uint
  }
)

(define-private (get-or-create-voter-id (user principal))
  (match
    (map-get? VoterIds user)
    value value
    (let
      (
        (newId (+ u1 (var-get voterIndex)))
      )
      (map-set Voters newId user)
      (map-set VoterIds user newId)
      (var-set voterIndex newId)
      newId
    )
  )
)

;; VOTE FUNCTIONS

(define-public (vote-on-proposal (vote bool))
  (let
    (
      (voterId (get-or-create-voter-id contract-caller))
      (voterRecord (map-get? Votes voterId))
      (voteMia (get-vote-mia contract-caller voterId))
      ;; TODO: get avgStackedNyc
    )
    ;; assert proposal is active
    (asserts! (and 
      (>= block-height VOTE_START_BLOCK)
      (<= block-height VOTE_END_BLOCK))
      ERR_PROPOSAL_NOT_ACTIVE)
    ;; print all information
    (ok true)
  )
)

;; MIA HELPERS

(define-map AvgStackedMia
  uint ;; user ID
  uint ;; amount
)

(define-private (get-vote-mia (user principal) (voterId uint))
  ;; returns (some uint) or (none)
  (let
    (
      (userIdMia (default-to u0 (contract-call? .citycoin-core-v1 get-user-id user)))
      ;; TODO: update to mainnet cycles
      (userCycle12 (contract-call? .citycoin-core-v1 get-stacker-at-cycle-or-default u2 userIdMia))
      (stackedCycle12 (get amountStacked userCycle12))
      (userCycle13 (contract-call? .citycoin-core-v1 get-stacker-at-cycle-or-default u3 userIdMia))
      (stackedCycle13 (get amountStacked userCycle13))
    )
    ;; check if user was found
    (asserts! (> userIdMia u0) none)
    ;; check if there is a positive value
    (asserts! (or (>= stackedCycle12 u0) (>= stackedCycle13 u0)) none)
    ;; check if the amount is already saved and return it
    ;; or calculate it, save it, and return it
    (match 
      (map-get? AvgStackedMia voterId)
      value (some value)
      (let
        (
          ;; ((stackedCycle12 * SCALE) + (stackedCycle13 * SCALE)) / 2
          ;; TODO: apply MIA scale factor here and return total vote?
          (scaledCycle12 (* stackedCycle12 VOTE_SCALE_FACTOR))
          (scaledCycle13 (* stackedCycle13 VOTE_SCALE_FACTOR))
          (scaledAvgMia (/ (+ scaledCycle12 scaledCycle13) u2))
          (avgStackedMia (/ scaledAvgMia VOTE_SCALE_FACTOR))
        )
        (some avgStackedMia)
      )
    )
  )
)
