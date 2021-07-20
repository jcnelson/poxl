(define-constant CONTRACT_OWNER tx-sender)

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