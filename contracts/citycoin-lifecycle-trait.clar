(define-trait lifecycle-trait (
    ;; Triggers startup procedure
    ;; - immediately, at current block height
    ;; - optional: at passed block height (has to be in future)
    (startup ((optional uint))
      (response bool uint)
    )
    
    ;; Triggers shutdown procedure
    ;; - immediately, at current block height
    ;; - optional: at passed block height (has to be in future)
    (shutdown ((optional uint))
      (response bool uint)
    )

    ;; Returns information about
    ;;  - contract version
    ;;  - when it has been or will be started 
    ;;  - when it has been or will be shutdown
    ;;  - current state
    (get-contract-info () (response 
        {
            version: (string-ascii 12),
            startupBH: (optional uint),
            shutdownBH: (optional uint),
            state: uint
        }
        uint    
    ))
))