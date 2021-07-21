;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; CITYCOIN CORE CONTRACT
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; CONTRACT OWNER
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(define-constant CONTRACT_OWNER tx-sender)

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; ERROR CODES
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(define-constant ERR_UNAUTHORIZED u1000)
(define-constant ERR_USER_ALREADY_REGISTERED u1001)
(define-constant ERR_USER_NOT_FOUND u1002)
(define-constant ERR_ACTIVATION_THRESHOLD_REACHED u1003)
(define-constant ERR_CONTRACT_NOT_ACTIVATED u1004)

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; CITY WALLET MANAGEMENT
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; initial value for city wallet
(define-data-var cityWallet principal 'ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE)

;; returns set city wallet principal
(define-read-only (get-city-wallet)
  (var-get cityWallet)
)
 
;; protected function to update city wallet variable
(define-public (set-city-wallet (newCityWallet principal))
  (begin
    (asserts! (is-authorized-city) (err ERR_UNAUTHORIZED))
    (ok (var-set cityWallet newCityWallet))
  )
)

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; REGISTRATION
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(define-data-var activationBlock uint u340282366920938463463374607431768211455)
(define-data-var activationDelay uint u150)
(define-data-var activationReached bool false)
(define-data-var activationThreshold uint u20)
(define-data-var usersNonce uint u0)

;; returns Stacks block height registration was activated at plus activationDelay
(define-read-only (get-activation-block)
  (let
    (
      (activated (var-get activationReached))
    )
    (asserts! activated (err ERR_CONTRACT_NOT_ACTIVATED))
    (ok (var-get activationBlock))
  )
)

;; returns activation delay
(define-read-only (get-activation-delay)
  (var-get activationDelay)
)

;; returns activation status as boolean
(define-read-only (get-activation-status)
  (var-get activationReached)
)

;; returns activation threshold
(define-read-only (get-activation-threshold)
  (var-get activationThreshold)
)

;; returns number of registered users, used for activation and tracking user IDs
(define-read-only (get-registered-users-nonce)
  (var-get usersNonce)
)

;; store user principal by user id
(define-map Users
  uint
  principal
)

;; store user id by user principal
(define-map UserIds
  principal
  uint
)

;; returns (some userId) or none
(define-read-only (get-user-id (user principal))
  (map-get? UserIds user)
)

;; returns (some userPrincipal) or none
(define-read-only (get-user (userId uint))
  (map-get? Users userId)
)

;; returns user ID if it has been created, or creates and returns new ID
(define-private (get-or-create-user-id (user principal))
  (match
    (map-get? UserIds user)
    value value
    (let
      (
        (newId (+ u1 (var-get usersNonce)))
      )
      (map-set Users newId user)
      (map-set UserIds user newId)
      (var-set usersNonce newId)
      newId
    )
  )
)

;; registers users that signal activation of contract until threshold is met
(define-public (register-user (memo (optional (string-utf8 50))))
  (let
    (
      (newId (+ u1 (var-get usersNonce)))
      (threshold (var-get activationThreshold))
    )

    ;; (asserts! (not (var-get initialized)) (err ERR_UNAUTHORIZED))

    (asserts! (is-none (map-get? UserIds tx-sender))
      (err ERR_USER_ALREADY_REGISTERED))

    (asserts! (<= newId threshold)
      (err ERR_ACTIVATION_THRESHOLD_REACHED))

    (if (is-some memo)
      (print memo)
      none
    )

    (get-or-create-user-id tx-sender)

    (if (is-eq newId threshold)
      (let 
        (
          (activationBlockVal (+ block-height (var-get activationDelay)))
        )
        (var-set activationReached true)
        (var-set activationBlock activationBlockVal)
        (var-set coinbaseThreshold1 (+ activationBlockVal TOKEN_HALVING_BLOCKS))
        (var-set coinbaseThreshold2 (+ activationBlockVal (* u2 TOKEN_HALVING_BLOCKS)))
        (var-set coinbaseThreshold3 (+ activationBlockVal (* u3 TOKEN_HALVING_BLOCKS)))
        (var-set coinbaseThreshold4 (+ activationBlockVal (* u4 TOKEN_HALVING_BLOCKS)))
        (var-set coinbaseThreshold5 (+ activationBlockVal (* u5 TOKEN_HALVING_BLOCKS)))
        (ok true)
      )
      (ok true)
    )
  )
)

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; TOKEN
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; how many blocks until the next halving occurs
(define-constant TOKEN_HALVING_BLOCKS u210000)

;; store block height at each halving, set by register-user    
(define-data-var coinbaseThreshold1 uint u0)
(define-data-var coinbaseThreshold2 uint u0)
(define-data-var coinbaseThreshold3 uint u0)
(define-data-var coinbaseThreshold4 uint u0)
(define-data-var coinbaseThreshold5 uint u0)

;; return coinbase thresholds if contract activated
(define-read-only (get-coinbase-thresholds)
  (let
    (
      (activated (var-get activationReached))
    )
    (asserts! activated (err ERR_CONTRACT_NOT_ACTIVATED))
    (ok {
      coinbaseThreshold1: (var-get coinbaseThreshold1),
      coinbaseThreshold2: (var-get coinbaseThreshold2),
      coinbaseThreshold3: (var-get coinbaseThreshold3),
      coinbaseThreshold4: (var-get coinbaseThreshold4),
      coinbaseThreshold5: (var-get coinbaseThreshold5)
    })
  )
)

;; function for deciding how many tokens to mint, depending on when they were mined
(define-read-only (get-coinbase-amount (minerBlockHeight uint))
  (begin
    ;; if contract is not active, return 0
    (asserts! (>= minerBlockHeight (var-get activationBlock)) u0)
    ;; if contract is active, return based on issuance schedule
    ;; halvings occur every 210,000 blocks for 1,050,000 Stacks blocks
    ;; then mining continues indefinitely with 3,125 CityCoins as the reward
    (asserts! (> minerBlockHeight (var-get coinbaseThreshold1))
      (if (<= (- minerBlockHeight (var-get activationBlock)) u10000)
        ;; bonus reward first 10,000 blocks
        u250000
        ;; standard reward remaining 200,000 blocks until 1st halving
        u100000
      )
    )
    ;; computations based on each halving threshold
    (asserts! (> minerBlockHeight (var-get coinbaseThreshold2)) u50000)
    (asserts! (> minerBlockHeight (var-get coinbaseThreshold3)) u25000)
    (asserts! (> minerBlockHeight (var-get coinbaseThreshold4)) u12500)
    (asserts! (> minerBlockHeight (var-get coinbaseThreshold5)) u6250)
    ;; default value after 5th halving
    u3125
  )
)

;; mint new tokens for claimant who won at given Stacks block height
(define-private (mint-coinbase (recipient principal) (stacksHeight uint))
  (contract-call? .citycoin-token mint (get-coinbase-amount stacksHeight) recipient)
)

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; UTILITIES
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; check if contract caller is city wallet
(define-private (is-authorized-city)
  (is-eq contract-caller (var-get cityWallet))
)

;; check if contract caller is contract owner
(define-private (is-authorized-owner)
  (is-eq contract-caller CONTRACT_OWNER)
)
