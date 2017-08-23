/**
 * Initiates a hierarchy. A hierarchy can either be built by Gulp, or mounted in Express.
 * A hierarchy is similar to the concept of Express apps, in fact it can mount itself 
 * in an express app.
 *
 * However it's different from express because it has to be able to list ALL of its endpoints.
 * If it can't do that, you'll need to do some more complicated fallback-manuvering.
 */
