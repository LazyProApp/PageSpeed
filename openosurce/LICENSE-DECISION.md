# License Decision

## Decision

Lazy PageSpeed is licensed under GNU Affero General Public License v3.0 (AGPL-3.0).

The previous restricted personal/internal-use license has been replaced. The project now uses a real open source license and is a better fit for Codex for Open Source submission.

## Practical impact of changing license

Changing to a real open source license means downstream users can generally:

- Use the software commercially.
- Fork and modify the software.
- Redistribute the software.
- Integrate the software into their own services or products, subject to the chosen license.

This cannot be solved by calling the license "open source" while keeping a ban on SaaS, commercial use, or redistribution.

## Considered options

### Apache-2.0

Best default if the goal is broad adoption with stronger patent language. It allows commercial use, modification, redistribution, private use, and sublicensing under its terms.

### MIT

Shortest and simplest permissive option. It is easy for users to understand, but has less explicit patent language than Apache-2.0.

### AGPL-3.0

Best if the goal is open source while discouraging closed hosted forks. It allows commercial use, but if someone modifies and runs the software as a network service, they must provide the corresponding source under AGPL terms.

## Rationale

AGPL-3.0 was selected because hosted-service risk is the main concern. It allows commercial use, modification, redistribution, and private use, but requires modified versions used over a network to make corresponding source code available under AGPL terms.

This is more aligned with open source than a custom non-commercial license while still discouraging closed hosted forks.
