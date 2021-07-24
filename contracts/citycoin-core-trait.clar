;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; CITYCOIN CORE TRAIT
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(define-trait citycoin-core
  (

    (register-user ((optional (string-utf8 50)))
      (response bool uint)
    )

    (mine-tokens (uint (optional (buff 34)))
      (response bool uint)
    )

    (claim-mining-reward (uint)
      (response bool uint)
    )

    (stack-tokens (uint uint)
      (response bool uint)
    )

    (claim-stacking-reward (uint)
      (response bool uint)
    )

  )
)
