;; CityCoins vote-v1
;; A voting mechanism inspired by SIP-012 for Stacks.

;; ERRORS

(define-constant ERR_USER_NOT_FOUND u8000)
(define-constant ERR_STACKER_NOT_FOUND u8001)
(define-constant ERR_PROPOSAL_NOT_FOUND u8002)
(define-constant ERR_PROPOSAL_NOT_ACTIVE u8003)
(define-constant ERR_VOTE_ALREADY_RECORDED u8004)

;; PROPOSALS

(define-data-var proposalId uint u0)

(define-map Proposals
  uint ;; proposalId
  {
    creator: principal,
    name: (string-ascii 255),
    link: (string-ascii 255),
    hash: (string-ascii 255),
    startBlock: uint,
    endBlock: uint
  }
)

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

(define-data-var userIndex uint u0)

(define-map Voters
  uint
  principal
)

(define-map VoterIds
  principal
  uint
)

(define-map Votes
  {
    userId: uint,
    proposalId: uint
  }
  {
    vote: bool,
    mia: uint,
    nyc: uint,
    total: uint
  }
)

(define-private (get-or-create-user-id (user principal))
  (match
    (map-get? VoterIds user)
    value value
    (let
      (
        (newId (+ u1 (var-get userIndex)))
      )
      (map-set Voters newId user)
      (map-set VoterIds user newId)
      (var-set userIndex newId)
      newId
    )
  )
)

;; TESTING COSTS

(define-public (add-proposal (user principal))
  ;; TODO: check CityCoin balance or stacked status
  ;; allow for adding a proposal - or just stacked status?
  (ok true)
)

(define-public (vote-on-proposal (user principal) (targetProposal uint) (vote bool))
  (let
    (
      ;; get proposal from map
      (proposal (unwrap! (map-get? Proposals targetProposal) (err ERR_PROPOSAL_NOT_FOUND)))
      (startBlock (get startBlock proposal))
      (endBlock (get endBlock proposal))
      ;; get voter record if it exists
      (voterId (get-or-create-user-id user))
      (voterRecord (map-get? Votes { userId: voterId, proposalId: targetProposal }))
      ;; get stacked MIA balance
      (userIdMia (unwrap!
        (contract-call? .citycoin-core-v1 get-user-id user)
        (err ERR_USER_NOT_FOUND)))
      (stackedMia (unwrap!
        (contract-call? .citycoin-core-v1 get-stacker-at-cycle u2 userIdMia)
        (err ERR_STACKER_NOT_FOUND)))
      (stackedMiaAmount (get amountStacked stackedMia))
      ;; get total supply of MIA at start block
        ;; at-block startBlock
        ;; unwrap total supply of token
      ;; get stacked NYC balance
      (userIdNyc (unwrap!
        (contract-call? .citycoin-core-v1 get-user-id user)
        (err ERR_USER_NOT_FOUND)))
      (stackedNyc (unwrap!
        (contract-call? .citycoin-core-v1 get-stacker-at-cycle u3 userIdNyc)
        (err ERR_STACKER_NOT_FOUND)))
      (stackedNycAmount (get amountStacked stackedNyc))
      ;; get total supply of NYC at start block
        ;; at-block startBlock
        ;; unwrap total supply of token
    )
    (asserts! (and
      (<= (get startBlock proposal) block-height)
      (>= (get endBlock proposal) block-height))
      (err ERR_PROPOSAL_NOT_ACTIVE))

    ;; (if (is-some voterRecord) true false)

    ;;(match voterRecord voteExists
      ;; found previous vote
    ;;  (begin
    ;;    (asserts! (not (is-eq (get vote voteExists) vote)) (err ERR_VOTE_ALREADY_RECORDED))
    ;;  )
      ;; no previous vote
    ;; )

    ;; print all information
    (print {
      user: user,
      proposal: proposal,
      startBlock: startBlock,
      endBlock: endBlock,
      voterId: voterId,
      voterRecord: voterRecord,
      userIdMia: userIdMia,
      stackedMia: stackedMiaAmount,
      userIdNyc: userIdNyc,
      stackedNyc: stackedNycAmount
    })
    (ok true)
  ) 
)
