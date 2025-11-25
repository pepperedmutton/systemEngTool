# NASA Systems Engineering Handbook Notes

Source: *NASA Systems Engineering Handbook*, NASA SP-2016-6105 Rev2 (PDF in repo).

## Key Concepts To Reuse

- **Systems Engineering Engine (Sec. 2.1)** - NASA organizes 17 Common Technical Processes (stakeholder expectation definition, technical requirements, logical decomposition, design solution definition, product realization, cross-cutting management, and specialty engineering). The "SE Engine" iterates through these processes in every life-cycle phase so coverage of stakeholder needs, verification, validation, and transitions is traceable.
- **Program/Project Life Cycle (Sec. 3)** - Concept and technology development happens during Pre-Phase A/Phase A, baselines are locked in Phase B, detailed design/fabrication in Phase C, integration/test/launch in Phase D, operations in Phase E, and closeout in Phase F. Tailoring of NPR 7123.1 requirements is expected but must be justified.
- **Logical (Functional) Decomposition (Sec. 4.3)** - Functional analysis is the primary mechanism for translating stakeholder expectations into architecture: (1) translate high-level requirements into functions, (2) recursively decompose and allocate them down the product breakdown structure, and (3) capture functional and subsystem interfaces. The handbook stresses recursion, capturing work products/rationales, and keeping flexibility to revisit earlier architectural assumptions.
- **Design Solution / Physical Architecture (Sec. 4.4)** - Design Solution Definition transforms logical models into physical solutions through alternative generation, trade studies, and baselining of a preferred alternative. Outputs include subsystem specs, validation plans, logistics considerations, and enabling-product requirements, which map closely to a "physical decomposition" view in our tool.
- **Verification vs. Validation (Sec. 2.4 & Sec. 5)** - Verification confirms that the product was built right (meets specifications) while validation ensures it is the right product for stakeholder needs. Requirements in our tool therefore need verification methods (analysis, inspection, test, demonstration) plus validation context.
- **Human Systems Integration & Crosscutting Management (Sec. 2.6 & Sec. 6)** - HSI, risk, configuration management, and data management processes must be threaded through every decomposition level; they are not optional add-ons.

These notes drive the data model: projects must carry life-cycle phase metadata, have both logical/functional and physical decomposition artifacts, and keep requirements tied to verification plans so engineers can reason traceably as described in the handbook.
