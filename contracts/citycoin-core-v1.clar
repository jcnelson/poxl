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
(define-constant ERR_USER_ID_NOT_FOUND u2004)
(define-constant ERR_ACTIVATION_THRESHOLD_REACHED u1003)
(define-constant ERR_CONTRACT_NOT_ACTIVATED u1004)
(define-constant ERR_USER_ALREADY_MINED u2001)
(define-constant ERR_INSUFFICIENT_COMMITMENT u2002)
(define-constant ERR_INSUFFICIENT_BALANCE u2003)
(define-constant ERR_USER_DID_NOT_MINE_IN_BLOCK u2005)
(define-constant ERR_CLAIMED_BEFORE_MATURITY u2006)
(define-constant ERR_NO_MINERS_AT_BLOCK u2007)
(define-constant ERR_REWARD_ALREADY_CLAIMED u2007)
(define-constant ERR_MINER_DID_NOT_WIN u2008)
(define-constant ERR_NO_VRF_SEED_FOUND u2009)
(define-constant ERR_STACKING_NOT_AVAILABLE u2010)
(define-constant ERR_CANNOT_STACK u2011)
(define-constant ERR_REWARD_CYCLE_NOT_COMPLETED u2012)
(define-constant ERR_NOTHING_TO_REDEEM u2013)

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
;; MINING CONFIGURATION
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; define split to custodied wallet address for the city
(define-constant SPLIT_CITY_PCT u30)

;; At a given Stacks block height:
;; - how many miners were there
;; - what was the total amount submitted
;; - what was the total amount submitted to the city
;; - what was the total amount submitted to Stackers
;; - was the block reward claimed
(define-map MiningStatsAtBlock
  uint
  {
    minersCount: uint,
    amount: uint,
    amountToCity: uint,
    amountToStackers: uint,
    rewardClaimed: bool
  }
)

;; returns map MiningStatsAtBlock at a given Stacks block height if it exists
(define-read-only (get-mining-stats-at-block (stacksHeight uint))
  (map-get? MiningStatsAtBlock stacksHeight)
)

;; returns map MiningStatsAtBlock at a given Stacks block height
;; or, an empty structure
(define-read-only (get-mining-stats-at-block-or-default (stacksHeight uint))
  (default-to {
      minersCount: u0,
      amount: u0,
      amountToCity: u0,
      amountToStackers: u0,
      rewardClaimed: false
    }
    (map-get? MiningStatsAtBlock stacksHeight)
  )
)

;; At a given Stacks block height and user ID:
;; - what is their ustx commitment
;; - what are the low/high values (used for VRF)
(define-map MinersAtBlock
  {
    stacksHeight: uint,
    userId: uint
  }
  {
    ustx: uint,
    lowValue: uint,
    highValue: uint,
    winner: bool
  }
)

;; returns true if a given miner has already mined at a given block height
(define-read-only (has-mined-at-block (stacksHeight uint) (userId uint))
  (is-some 
    (map-get? MinersAtBlock { stacksHeight: stacksHeight, userId: userId })
  )
)

;; returns map MinersAtBlock at a given Stacks block height for a user ID
(define-read-only (get-miner-at-block (stacksHeight uint) (userId uint))
  (map-get? MinersAtBlock { stacksHeight: stacksHeight, userId: userId })
)

;; returns map MinersAtBlock at a given Stacks block height for a user ID
;; or, an empty structure
(define-read-only (get-miner-at-block-or-default (stacksHeight uint) (userId uint))
  (default-to {
    highValue: u0,
    lowValue: u0,
    ustx: u0,
    winner: false
  }
    (map-get? MinersAtBlock { stacksHeight: stacksHeight, userId: userId }))
)

;; At a given Stacks block height:
;; - what is the max highValue from MinersAtBlock (used for VRF)
(define-map MinersAtBlockHighValue
  uint
  uint
)

;; returns last high value from map MinersAtBlockHighValue
(define-read-only (get-last-high-value-at-block (stacksHeight uint))
  (default-to u0
    (map-get? MinersAtBlockHighValue stacksHeight))
)

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; MINING ACTIONS
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(define-public (mine-tokens (amountUstx uint) (memo (optional (buff 34))))
  (let
    (
      (userId (get-or-create-user-id tx-sender))
    )
    (try! (mine-tokens-at-block userId block-height amountUstx memo))
    (ok true)
  )
)

(define-private (mine-tokens-at-block (userId uint) (stacksHeight uint) (amountUstx uint) (memo (optional (buff 34))))
  (let
    (
      (rewardCycle (default-to u0 (get-reward-cycle stacksHeight)))
      (stackingActive (stacking-active-at-cycle rewardCycle))
      (toCity
        (if stackingActive
          (/ (* SPLIT_CITY_PCT amountUstx) u100)
          amountUstx
        )
      )
      (toStackers (- amountUstx toCity))
    )
    (asserts! (get-activation-status) (err ERR_CONTRACT_NOT_ACTIVATED))
    (asserts! (not (has-mined-at-block stacksHeight userId)) (err ERR_USER_ALREADY_MINED))
    (asserts! (> amountUstx u0) (err ERR_INSUFFICIENT_COMMITMENT))
    (asserts! (>= (stx-get-balance tx-sender) amountUstx) (err ERR_INSUFFICIENT_BALANCE))
    (try! (set-tokens-mined userId stacksHeight amountUstx toStackers toCity))
    (if (is-some memo)
      (print memo)
      none
    )
    (if stackingActive
      (try! (stx-transfer? toStackers tx-sender .citycoin-core))
      false
    )
    (try! (stx-transfer? toCity tx-sender (var-get cityWallet)))
    (ok true)
  )
)

(define-private (set-tokens-mined (userId uint) (stacksHeight uint) (amountUstx uint) (toStackers uint) (toCity uint))
  (let
    (
      (blockStats (get-mining-stats-at-block-or-default stacksHeight))
      (newMinersCount (+ (get minersCount blockStats) u1))
      (minerLowVal (get-last-high-value-at-block stacksHeight))
      (rewardCycle (unwrap! (get-reward-cycle stacksHeight)
        (err ERR_STACKING_NOT_AVAILABLE)))
      (rewardCycleStats (get-stacking-stats-at-cycle-or-default rewardCycle))
    )
    (map-set MiningStatsAtBlock
      stacksHeight
      {
        minersCount: newMinersCount,
        amount: (+ (get amount blockStats) amountUstx),
        amountToCity: (+ (get amountToCity blockStats) toCity),
        amountToStackers: (+ (get amountToStackers blockStats) toStackers),
        rewardClaimed: false
      }
    )
    (map-set MinersAtBlock
      {
        stacksHeight: stacksHeight,
        userId: userId
      }
      {
        ustx: amountUstx,
        lowValue: (+ minerLowVal u1),
        highValue: (+ minerLowVal amountUstx),
        winner: false
      }
    )
    (map-set MinersAtBlockHighValue
      stacksHeight
      (+ minerLowVal amountUstx)
    )
    (map-set StackingStatsAtCycle
      stacksHeight
      {
        amountUstx: (+ (get amountUstx rewardCycleStats) toStackers),
        amountToken: (get amountToken rewardCycleStats)
      }
    )
    (ok true)
  )
)

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; MINING REWARD CLAIM ACTIONS
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; how long a miner must wait before block winner can claim their minted tokens
(define-data-var tokenRewardMaturity uint u100)

;; calls function to claim mining reward in active logic contract
(define-public (claim-mining-reward (minerBlockHeight uint))
  (begin
    (try! (claim-mining-reward-at-block tx-sender block-height minerBlockHeight))
    (ok true)
  )
)

;; Determine whether or not the given principal can claim the mined tokens at a particular block height,
;; given the miners record for that block height, a random sample, and the current block height.
(define-private (claim-mining-reward-at-block (user principal) (stacksHeight uint) (minerBlockHeight uint))
  (let
    (
      (maturityHeight (+ (var-get tokenRewardMaturity) minerBlockHeight))
      (userId (unwrap! (get-user-id user) (err ERR_USER_ID_NOT_FOUND)))
      (blockStats (unwrap! (get-mining-stats-at-block minerBlockHeight) (err ERR_NO_MINERS_AT_BLOCK)))
      (minerStats (unwrap! (get-miner-at-block minerBlockHeight userId) (err ERR_USER_DID_NOT_MINE_IN_BLOCK)))
      (vrfSample (unwrap! (contract-call? .citycoin-vrf get-random-uint-at-block maturityHeight) (err ERR_NO_VRF_SEED_FOUND)))
      (commitTotal (get-last-high-value-at-block minerBlockHeight))
      (winningValue (mod vrfSample commitTotal))
    )
    (asserts! (> stacksHeight maturityHeight) (err ERR_CLAIMED_BEFORE_MATURITY))
    (asserts! (has-mined-at-block minerBlockHeight userId) (err ERR_USER_DID_NOT_MINE_IN_BLOCK))
    (asserts! (not (get rewardClaimed blockStats)) (err ERR_REWARD_ALREADY_CLAIMED))
    (asserts! (not (is-eq commitTotal u0)) (err ERR_NO_MINERS_AT_BLOCK))
    (asserts! (and (>= winningValue (get lowValue minerStats)) (<= winningValue (get highValue minerStats)))
      (err ERR_MINER_DID_NOT_WIN))
    (try! (set-mining-reward-claimed userId minerBlockHeight))
    (ok true)
  )
)

(define-private (set-mining-reward-claimed (userId uint) (minerBlockHeight uint))
  (let
    (
      (blockStats (get-mining-stats-at-block-or-default minerBlockHeight))
      (minerStats (get-miner-at-block-or-default minerBlockHeight userId))
      (user (unwrap! (get-user userId) (err ERR_USER_NOT_FOUND)))
    )
    (merge blockStats { rewardClaimed: true })
    (merge minerStats { winner: true })
    (try! (mint-coinbase user minerBlockHeight))
    (ok true)
  )
)

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; STACKING CONFIGURATION
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;; how long a reward cycle is
(define-data-var rewardCycleLength uint u2100)

;; At a given reward cycle:
;; - how many Stackers were there
;; - what is the total uSTX submitted by miners
;; - what is the total amount of tokens stacked
(define-map StackingStatsAtCycle
  uint
  {
    amountUstx: uint,
    amountToken: uint
  }
)

;; returns the total stacked tokens and committed uSTX for a given reward cycle
(define-read-only (get-stacking-stats-at-cycle (rewardCycle uint))
  (map-get? StackingStatsAtCycle rewardCycle)
)

;; returns the total stacked tokens and committed uSTX for a given reward cycle
;; or, an empty structure
(define-read-only (get-stacking-stats-at-cycle-or-default (rewardCycle uint))
  (default-to { amountUstx: u0, amountToken: u0 }
    (map-get? StackingStatsAtCycle rewardCycle))
)

;; At a given reward cycle and user ID:
;; - what is the total tokens Stacked?
;; - how many tokens should be returned? (based on Stacking period)
(define-map StackerAtCycle
  {
    rewardCycle: uint,
    userId: uint
  }
  {
    amountStacked: uint,
    toReturn: uint
  }
)

(define-read-only (get-stacker-at-cycle (rewardCycle uint) (userId uint))
  (map-get? StackerAtCycle { rewardCycle: rewardCycle, userId: userId })
)

(define-read-only (get-stacker-at-cycle-or-default (rewardCycle uint) (userId uint))
  (default-to { amountStacked: u0, toReturn: u0 }
    (map-get? StackerAtCycle { rewardCycle: rewardCycle, userId: userId }))
)

;; get the reward cycle for a given Stacks block height
(define-read-only (get-reward-cycle (stacksHeight uint))
  (let
    (
      (firstStackingBlock (var-get activationBlock))
      (rcLen (var-get rewardCycleLength))
    )
    (if (>= stacksHeight firstStackingBlock)
      (some (/ (- stacksHeight firstStackingBlock) rcLen))
      none)
  )
)

;; determine if stacking is active in a given cycle
(define-read-only (stacking-active-at-cycle (rewardCycle uint))
  (is-some
    (get amountToken (map-get? StackingStatsAtCycle rewardCycle))
  )
)

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; STACKING ACTIONS
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;



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
