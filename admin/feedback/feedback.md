# Peer Review Feedback for Team 12

**By Team 11, for UCSD CSE 110 SP26**

## Strength

**We noticed that the CI/CD pipeline at .github/workflows/main.yml seems well done. It has not only linting, but also formatting with some custom style rules specific to the team, not to mention unit tests, build verifications, and security audits of dependencies.**

## Area for Improvement: Docs and Architectural Decision Records

**Team 12 has adopted the MADR specification, and documented the decision to adopt that standard. However, that is the only ADR in the main branch of the repository. There are other ADRs for choices like HTML+CSS+JS or ‘Flat Json Data Store’ and ‘Frontend Foundation’ but these are strewn across other branches like implement/form-submission, not easy to find. Likewise the branch task/backend-design-docs is compelling but not easily discoverable.**

## Area for Improvement: Contribution and Feature Distribution

**Running git shortlog -sn --all shows a long tail distribution of team member commits, at least to main, this suggests a disproportionate level of contributions. Also, it appears to be the case that some feature branches like implement/form-submission have a lot of commits ahead and behind of main on them so it is unclear as to what is their viability / whether they’re stuck in a sort of purgatory. The two seem related, as perhaps some work is yet to merge.**

## Question

**docs/research/ contains individual prototypes from several team members. What was the process for converting these into the final UI? Was one prototype adopted as the base, or did the team run structured design reviews to cherry pick the final elements?**

## Suggestion

**Open draft PRs for the implement branches, even if the code is not ready to merge to give the whole team visibility, an opportunity to contribute, kickstart the review process, and identify what is blocking implementation.**
