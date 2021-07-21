(define-constant CONTRACT_OWNER tx-sender)

;; ERRORS
(define-constant ERR_UNKNOWN_JOB u6000)
(define-constant ERR_UNAUTHORIZED u6001)
(define-constant ERR_JOB_IS_ACTIVE u6002)
(define-constant ERR_JOB_IS_NOT_ACTIVE u6003)
(define-constant ERR_ALREADY_APPROVED u6004)
(define-constant ERR_JOB_IS_EXECUTED u6005)
(define-constant ERR_JOB_IS_NOT_APPROVED u6006)
(define-constant ERR_ARGUMENT_ALREADY_EXISTS u6007)

(define-constant REQUIRED_APPROVALS u2)

(define-data-var lastJobId uint u0)

(define-map Jobs
  uint ;; jobId
  {
    creator: principal,
    name: (string-ascii 255),
    target: principal,
    approvals: uint,
    isActive: bool,
    isExecuted: bool,
  }
)

(define-map JobApprovers
  { jobId: uint, approver: principal }
  bool
)

(define-map Approvers
  principal
  bool
)

(define-map ArgumentLastIdsByType
  { jobId: uint, argumentType: (string-ascii 25) }
  uint
)

(define-map UIntArgumentsByName
  { jobId: uint, argumentName: (string-ascii 255) }
  { argumentId: uint, value: uint}
)

(define-map UIntArgumentsById
  { jobId: uint, argumentId: uint }
  { argumentName: (string-ascii 255), value: uint }
)

;; FUNCTIONS
(define-read-only (get-last-job-id)
  (var-get lastJobId)
)

(define-public (create-job (name (string-ascii 255)) (target principal))
  (let
    (
      (newJobId (+ (var-get lastJobId) u1))
    )
    ;; TODO: security
    (map-set Jobs
      newJobId
      {
        creator: tx-sender,
        name: name,
        target: target,
        approvals: u0,
        isActive: false,
        isExecuted: false,
      }
    )
    (var-set lastJobId newJobId)
    (ok newJobId)
  )
)

(define-read-only (get-job (jobId uint))
  (map-get? Jobs jobId)
)

(define-public (activate-job (jobId uint))
  (let
    (
      (job (unwrap! (get-job jobId) (err ERR_UNKNOWN_JOB)))
    )
    (asserts! (is-eq (get creator job) tx-sender) (err ERR_UNAUTHORIZED))
    (asserts! (not (get isActive job)) (err ERR_JOB_IS_ACTIVE))
    (map-set Jobs 
      jobId
      (merge job { isActive: true })
    )
    (ok true)
  )
)

(define-public (approve-job (jobId uint))
  (let
    (
      (job (unwrap! (get-job jobId) (err ERR_UNKNOWN_JOB)))
    )
    (asserts! (get isActive job) (err ERR_JOB_IS_NOT_ACTIVE))
    (asserts! (not (has-approved jobId tx-sender)) (err ERR_ALREADY_APPROVED))
    (asserts! (is-approver tx-sender) (err ERR_UNAUTHORIZED))
    (map-set JobApprovers
      { jobId: jobId, approver: tx-sender }
      true
    )
    (map-set Jobs
      jobId
      (merge job { approvals: (+ (get approvals job) u1) })
    )
    
    (ok true)
  )
)

(define-read-only (is-job-approved (jobId uint))
  (match (get-job jobId) job
    (>= (get approvals job) REQUIRED_APPROVALS)
    false
  )
)

(define-public (mark-job-as-executed (jobId uint))
  (let
    (
      (job (unwrap! (get-job jobId) (err ERR_UNKNOWN_JOB)))
    )
    (asserts! (get isActive job) (err ERR_JOB_IS_NOT_ACTIVE))
    (asserts! (>= (get approvals job) REQUIRED_APPROVALS) (err ERR_JOB_IS_NOT_APPROVED))
    (asserts! (is-eq (get target job) contract-caller) (err ERR_UNAUTHORIZED))
    (asserts! (not (get isExecuted job)) (err ERR_JOB_IS_EXECUTED))
    (map-set Jobs
      jobId
      (merge job { isExecuted: true })
    )
    (ok true)
  )
)

(define-public (add-uint-argument (jobId uint) (argumentName (string-ascii 255)) (value uint))
  (let
    (
      (argumentId (generate-argument-id jobId "uint"))
    )
    (try! (guard-add-argument jobId))
    (asserts! 
      (and
        (map-insert UIntArgumentsById
          { jobId: jobId, argumentId: argumentId }
          { argumentName: argumentName, value: value }
        )
        (map-insert UIntArgumentsByName
          { jobId: jobId, argumentName: argumentName }
          { argumentId: argumentId, value: value}
        )
      ) 
      (err ERR_ARGUMENT_ALREADY_EXISTS)
    )
    (ok true)
  )
)

(define-read-only (get-uint-argument-by-name (jobId uint) (argumentName (string-ascii 255)))
  (map-get? UIntArgumentsByName { jobId: jobId, argumentName: argumentName })
)

(define-read-only (get-uint-argument-by-id (jobId uint) (argumentId uint))
  (map-get? UIntArgumentsById { jobId: jobId, argumentId: argumentId })
)

(define-read-only (get-uint-value-by-name (jobId uint) (argumentName (string-ascii 255)))
  (get value (get-uint-argument-by-name jobId argumentName))
)

(define-read-only (get-uint-value-by-id (jobId uint) (argumentId uint))
  (get value (get-uint-argument-by-id jobId argumentId))
)

;; PRIVATE FUNCIONS
(define-private (has-approved (jobId uint) (approver principal))
  (default-to false (map-get? JobApprovers { jobId: jobId, approver: approver }))
)

(define-private (is-approver (user principal))
  (default-to false (map-get? Approvers user))
)

(define-private (generate-argument-id (jobId uint) (argumentType (string-ascii 25)))
  (let
    (
      (argumentId (+ (default-to u0 (map-get? ArgumentLastIdsByType { jobId: jobId, argumentType: argumentType })) u1))
    )
    (map-set ArgumentLastIdsByType
      { jobId: jobId, argumentType: argumentType }
      argumentId
    )
    ;; return
    argumentId
  )
)

(define-private (guard-add-argument (jobId uint))
  (let
    (
      (job (unwrap! (get-job jobId) (err ERR_UNKNOWN_JOB)))
    )
    (asserts! (not (get isActive job)) (err ERR_JOB_IS_ACTIVE))
    (asserts! (is-eq (get creator job) contract-caller) (err ERR_UNAUTHORIZED))
    (ok true)
  )
)

;; CONTRACT INITIALIZATION
(map-insert Approvers 'ST1J4G6RR643BCG8G8SR6M2D9Z9KXT2NJDRK3FBTK true)
(map-insert Approvers 'ST20ATRN26N9P05V2F1RHFRV24X8C8M3W54E427B2 true)
(map-insert Approvers 'ST21HMSJATHZ888PD0S0SSTWP4J61TCRJYEVQ0STB true)