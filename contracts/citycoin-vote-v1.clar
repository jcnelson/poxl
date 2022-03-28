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

;; CONSTANTS

;; TODO: update block heights
(define-constant VOTE_START_BLOCK u0)
(define-constant VOTE_END_BLOCK u0)
(define-constant VOTE_PROPOSAL_KEY u0)
(define-constant VOTE_SCALE_FACTOR (pow u10 u16)) ;; 16 decimal places
(define-constant MIA_SCALE_FACTOR u70) ;; 70 percent
;; TODO: define constants for total supply

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

;; intialize ProposalVotes
(map-insert ProposalVotes VOTE_PROPOSAL_KEY {
  yesCount: u0,
  yesMia: u0,
  yesNyc: u0,
  yesTotal: u0,
  noCount: u0,
  noMia: u0,
  noNyc: u0,
  noTotal: u0
})

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
      (proposalRecord (unwrap! (map-get? ProposalVotes VOTE_PROPOSAL_KEY) ERR_PROPOSAL_NOT_FOUND))
    )
    ;; assert proposal is active
    (asserts! (and 
      (>= block-height VOTE_START_BLOCK)
      (<= block-height VOTE_END_BLOCK))
      ERR_PROPOSAL_NOT_ACTIVE)
    ;; determine if vote record exists already
    (match voterRecord record
      ;; vote record exists
      (begin
        ;; check if vote is the same as what's recorded
        (asserts! (not (is-eq (get vote record) vote)) ERR_VOTE_ALREADY_RECORDED)
        ;; record the new vote
        (merge record { vote: vote })
        ;; update the vote totals
        (if vote
          (merge proposalRecord {
            yesCount: (+ (get yesCount proposalRecord) u1),
            yesMia: (+ (get yesMia proposalRecord) (get mia record)),
            yesNyc: (+ (get yesNyc proposalRecord) (get nyc record)),
            yesTotal: (+ (get yesTotal proposalRecord) (get total record)),
            noCount: (- (get noCount proposalRecord) u1),
            noMia: (- (get noMia proposalRecord) (get mia record)),
            noNyc: (- (get noNyc proposalRecord) (get nyc record)),
            noTotal: (- (get noTotal proposalRecord) (get total record))
          })
          (merge proposalRecord {
            yesCount: (- (get yesCount proposalRecord) u1),
            yesMia: (- (get yesMia proposalRecord) (get mia record)),
            yesNyc: (- (get yesNyc proposalRecord) (get nyc record)),
            yesTotal: (- (get yesTotal proposalRecord) (get total record)),
            noCount: (+ (get noCount proposalRecord) u1),
            noMia: (+ (get noMia proposalRecord) (get mia record)),
            noNyc: (+ (get noNyc proposalRecord) (get nyc record)),
            noTotal: (+ (get noTotal proposalRecord) (get total record))
          })
        )
      )
      ;; vote record doesn't exist
      (let
        (
          (scaledVoteMia (default-to u0 (get-mia-vote-amount contract-caller voterId)))
          (scaledVoteNyc (default-to u0 (get-nyc-vote-amount contract-caller voterId)))
          (scaledVoteTotal (/ (+ scaledVoteMia scaledVoteNyc) u2))
          (voteMia (scale-down scaledVoteMia))
          (voteNyc (scale-down scaledVoteNyc))
          (voteTotal (+ voteMia voteNyc))
        )
        (map-insert Votes voterId {
          vote: vote,
          mia: voteMia,
          nyc: voteNyc,
          total: voteTotal
        })
        ;; update the vote totals
        (if vote
          (merge proposalRecord {
            yesCount: (+ (get yesCount proposalRecord) u1),
            yesMia: (+ (get yesMia proposalRecord) voteMia),
            yesNyc: (+ (get yesNyc proposalRecord) voteNyc),
            yesTotal: (+ (get yesTotal proposalRecord) voteTotal),
          })
          (merge proposalRecord {
            noCount: (+ (get noCount proposalRecord) u1),
            noMia: (+ (get noMia proposalRecord) voteMia),
            noNyc: (+ (get noNyc proposalRecord) voteNyc),
            noTotal: (+ (get noTotal proposalRecord) voteTotal)
          })
        )
      )
    )
    ;; TODO: print all information
    (ok true)
  )
)

;; MIA HELPERS

(define-map MiaVote
  uint ;; user ID
  uint ;; amount
)

(define-private (get-mia-vote-amount (user principal) (voterId uint))
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
    (match (map-get? MiaVote voterId) value
      (some value)
      (let
        (
          (avgStackedMia (/ (+ (scale-up stackedCycle12) (scale-up stackedCycle13))))
          (scaledMiaVote (/ (* avgStackedMia MIA_SCALE_FACTOR) u100))
        )
        (map-insert MiaVote voterId scaledMiaVote)
        (some scaledMiaVote)
      )
    )
  )
)

;; NYC HELPERS

(define-map NycVote
  uint ;; user ID
  uint ;; amount
)

(define-private (get-nyc-vote-amount (user principal) (voterId uint))
  ;; returns (some uint) or (none)
  (let
    (
      (userIdNyc (default-to u0 (contract-call? .citycoin-core-v1 get-user-id user)))
      ;; TODO: update to mainnet cycles
      (userCycle6 (contract-call? .citycoin-core-v1 get-stacker-at-cycle-or-default u2 userIdNyc))
      (stackedCycle6 (get amountStacked userCycle6))
      (userCycle7 (contract-call? .citycoin-core-v1 get-stacker-at-cycle-or-default u3 userIdNyc))
      (stackedCycle7 (get amountStacked userCycle7))
    )
    ;; check if user was found
    (asserts! (> userIdNyc u0) none)
    ;; check if there is a positive value
    (asserts! (or (>= stackedCycle6 u0) (>= stackedCycle7 u0)) none)
    ;; check if the amount is already saved and return it
    ;; or calculate it, save it, and return it
    (match 
      (map-get? NycVote voterId)
      value (some value)
      (let
        (
          (nycVote (/ (+ (scale-up stackedCycle6) (scale-up stackedCycle7))))
        )
        (map-insert NycVote voterId nycVote)
        (some nycVote)
      )
    )
  )
)

;; UTILITIES
;; CREDIT: math functions taken from Alex math-fixed-point-16.clar

(define-private (scale-up (a uint))
  (* a VOTE_SCALE_FACTOR)
)

(define-private (scale-down (a uint))
  (/ a VOTE_SCALE_FACTOR)
)
