;; CityCoins vote-v1
;; A voting mechanism inspired by SIP-012 for Stacks.

;; ERRORS

(define-constant ERR_USER_NOT_FOUND u1000)
(define-constant ERR_STACKER_NOT_FOUND u1001)

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
    yes: uint,
    no: uint,
    count: uint
  }
)

;; USERS

(define-data-var userIndex uint u0)

(define-map Users
  uint
  principal
)

(define-map UserIds
  principal
  uint
)

(define-map UserVotes
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
    (map-get? UserIds user)
    value value
    (let
      (
        (newId (+ u1 (var-get userIndex)))
      )
      (map-set Users newId user)
      (map-set UserIds user newId)
      (var-set userIndex newId)
      newId
    )
  )
)

;; TESTING COSTS

(define-public (add-proposal)
  ;; TODO: check CityCoin balance or stacked status
  ;; allow for adding a proposal
  (ok true)
)

(define-public (vote-on-proposal (user principal) (proposal uint) (vote bool))
  (let
    (
      (voterId (get-or-create-user-id user))
      (userIdMia (unwrap!
        (contract-call? .citycoin-core-v1 get-user-id user)
        (err ERR_USER_NOT_FOUND)))
      (stackedMia (unwrap!
        (contract-call? .citycoin-core-v1 get-stacker-at-cycle u2 userIdMia)
        (err ERR_STACKER_NOT_FOUND)))
      (stackedMiaAmount (get amountStacked stackedMia))
      (userIdNyc (unwrap!
        (contract-call? .citycoin-core-v1 get-user-id user)
        (err ERR_USER_NOT_FOUND)))
      (stackedNyc (unwrap!
        (contract-call? .citycoin-core-v1 get-stacker-at-cycle u3 userIdNyc)
        (err ERR_STACKER_NOT_FOUND)))
      (stackedNycAmount (get amountStacked stackedNyc))
    )
    ;; TODO: assert proposal is found
    ;; TODO: assert proposal is in active voting window
    ;; TODO: assert vote isn't the same as previous vote

    ;; SET MAPS

    ;; ProposalVotes:
      ;; per proposalId
      ;; yes, no, count
    
    ;; UserVotes:
      ;; per userId + proposalId
      ;; vote, mia, nyc, total

    ;; print all information
    (print {
      user: user,
      proposal: proposal,
      voterId: voterId,
      userIdMia: userIdMia,
      stackedMia: stackedMiaAmount,
      userIdNyc: userIdNyc,
      stackedNyc: stackedNycAmount
    })
    (ok true)
  ) 
)
