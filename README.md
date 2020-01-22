# Running/Install Instructions

Utilizes docker and Node.js

Tested with:
  docker - v19.03.3
  node - v12.14.1
  npm - v6.13.6

1. `git clone` and `npm i` should install everything needed to run the code.
2. Start dgraph first. `npm run db` should be run and left open (or sent to background).
3. Start the API server with `npm run start`
  - the server will first load person.txt and relationship.txt from the data directory
  - when the server is ready it will log "listening at ..."

# The API

curl is sufficient to demonstrate the implementation

Create an API Server with the following functionality
  - Get a user by id
    `curl localhost:3000/user/1`
  - Get the connections from user id=X
    combined with next
  - How many total connections does user id=X have?
    `curl localhost:3000/user/1/connections`
      returns first degree connections and total first degree connections
    `curl localhost:3000/user/1/connections?degree=2`
      returns second degree connections and total second degree connections    
  - Who can introduce user id=X to user id=Y?
    `curl localhost:3000/introduce?to=3&from=34`
  - Which connections are common between user id=X and user id=Y?
    `curl localhost:3000/common/3/34`
      returns first degree common connections
    `curl localhost:3000/common/3/34?degree=2`
      returns second degree common connections
  - Which user has the most connections?
    combined with next
  - Which user has the least connections?
    `curl localhost:3000/min-max`
      returns people with most and least connections { min, max } by second degree
    `curl localhost:3000/min-max?degree=3`
      returns people with most and least connections { min, max } by third degree

All degree query options take any positive integer.

Comparisons resulting in ties (shortest introduction path, most/least connections) return the first result.
