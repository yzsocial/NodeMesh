# AI Collaboration Guidelines

This document outlines best practices for AI collaboration on this project. It serves as a reminder for both developers and AI assistants about expectations and working methodologies.

## Project
Our goal is to create a fully decentralized peer-to-peer (P2P) network application. Like all P2P systems, joining the network will require the user of a server. We will be using the peerjs P2P library as well as the peerjs server. This particular project  
is focused on the library and we will create another project that allows us to run the server.

## General Approach

- Present multiple possibilities and hypotheses with appropriate confidence levels
- Suggest validation methods before jumping to solutions
- Acknowledge the limits of what you can know without full context
- Respect developer expertise while providing your perspective
- Label assumptions clearly and consider edge cases

## Code Suggestions

- Explain the rationale behind suggested code
- Present alternative approaches when relevant
- Consider both immediate solutions and long-term maintainability
- Highlight potential edge cases or performance considerations
- Format code properly with appropriate language identifiers

## Troubleshooting Methodology

- Provide diagnostic approaches before solutions
- Present multiple possible causes with confidence levels
- Suggest verification steps for each hypothesis
- Be explicit about trade-offs in different troubleshooting approaches
- Acknowledge system and environment variables that might impact the issue

## Project-Specific Context

- **Project Type**: This is a prototype that will likely evolve into a fully working system. Documentation and architecture must reflect that. Test cases and non-deployed sections of the code should be placed into a separate file. [e.g., Production application, educational tool, prototype]
- **Technical Stack**: Node.js, peerjs [e.g., Node.js v16, React 18, TypeScript 4.8]
- **Key Constraints**: Clarity, simplicity and readability [e.g., Performance critical, backwards compatibility required]
- **Code Style Preferences**: OOP [e.g., Functional approach preferred, comprehensive error handling]
- **Development Environment**: Cursor IDE [e.g., macOS, Cursor IDE, Node.js runtime]

## Communication Preferences

- **Detail Level**: Concise with the ability to expand if requested [e.g., Prioritize conciseness, provide detailed explanations]
- **Learning Focus**: Concepts should be simple and easy to understand. If they are not, document them in a way that is easy to follow [e.g., Explain concepts thoroughly, focus on practical solutions]
- **Iteration Style**: Only make changes that are specifically requested though you can suggest other changes that might be useful [e.g., Prefer incremental improvements, comprehensive solutions]
- **Domain Knowledge**: This project requires expertise in distributed hash tables and peer to peer networking. The DHT model we will be using is similar to the Chord algorithm [Assume expertise in X, provide background on Y]

## Common Pitfalls to Avoid

- Presenting a single solution with unwarranted certainty
- Ignoring environment-specific considerations
- Providing overly complex solutions when simplicity is preferred
- Failing to consider the broader architecture and project context
- Overlooking performance implications in critical paths 

## Project Architecture

- **Network Layer**: PeerJS for direct P2P communication
- **DHT Layer**: Chord-like algorithm for distributed data storage/retrieval
- **Application Layer**: [Specific use case functionality]

Key architectural considerations:
- Node identity and persistence strategy
- Approach to NAT traversal and connection stability
- Data persistence model (ephemeral vs. persistent)
- Security and privacy considerations 