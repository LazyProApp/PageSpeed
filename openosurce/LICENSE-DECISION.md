# License Decision

## Current state

Lazy PageSpeed currently uses a restricted personal/internal-use license. It allows personal or internal company use, modification for internal needs, and learning or research. It prohibits external service integration, SaaS usage, redistribution, and commercial use.

That restriction is incompatible with the usual meaning of open source. If the project is submitted to Codex for Open Source as-is, the license is likely to be the main rejection risk.

## Practical impact of changing license

Changing to a real open source license means downstream users can generally:

- Use the software commercially.
- Fork and modify the software.
- Redistribute the software.
- Integrate the software into their own services or products, subject to the chosen license.

This cannot be solved by calling the license "open source" while keeping a ban on SaaS, commercial use, or redistribution.

## Recommended options

### Apache-2.0

Best default if the goal is broad adoption with stronger patent language. It allows commercial use, modification, redistribution, private use, and sublicensing under its terms.

### MIT

Shortest and simplest permissive option. It is easy for users to understand, but has less explicit patent language than Apache-2.0.

### AGPL-3.0

Best if the goal is open source while discouraging closed hosted forks. It allows commercial use, but if someone modifies and runs the software as a network service, they must provide the corresponding source under AGPL terms.

## Recommendation

Use AGPL-3.0 if the hosted-service risk is the main concern. Use Apache-2.0 if adoption and contribution friction matter more than preventing closed hosted forks.

Do not use a custom non-commercial license if the goal is to apply as an open-source maintainer.
