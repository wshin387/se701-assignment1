// Environment variable used to set the in-memory database when the server is instantiated
process.env.NODE_ENV = 'test';

const sinon = require('sinon');
const supertest = require('supertest');
const middleware = require('../../src/middleware/firebaseAuth');
const db = require('../../src/db');

const middlewareStub = sinon.stub(middleware, 'firebaseAuthMiddleware');
const app = require('../../app');

describe('Posts API', () => {
  beforeAll(async done => {
    db.connect()
      .then(() => done())
      .catch(err => done(err));
  });

  beforeEach(async done => {
    middlewareStub.callsFake((req, res, next) => {
      req.user = { email: 'test@test.com' };
      next();
    });
    // clear database after each test to remove any dependencies between tests
    db.drop()
      .then(() => done())
      .catch(err => done(err));
  });

  afterAll(async done => {
    db.close()
      .then(() => done())
      .catch(err => done(err));
  });

  /* Tests for get all posts API */
  it('tests the get all posts endpoint with no posts', async done => {
    const response2 = await supertest(app).get('/api/posts');
    expect(response2.status).toBe(200);

    expect(response2.body).toMatchObject([]);

    done();
  });

  it('tests the get all posts endpoint with one post', async done => {
    const postData = {
      title: 'Test post',
      body: 'This is the body for a test post',
    };

    const response = await supertest(app)
      .post('/api/posts')
      .send(postData);

    expect(response.status).toBe(201);

    const response2 = await supertest(app).get('/api/posts');
    expect(response2.status).toBe(200);
    const createdPost = response2.body;

    expect(createdPost[0].title).toBe(postData.title);
    expect(createdPost[0].body).toBe(postData.body);

    expect(createdPost[0].upvotes_clap).toBe(0);
    expect(createdPost[0].upvotes_laugh).toBe(0);
    expect(createdPost[0].upvotes_sad).toBe(0);

    done();
  });

  it('tests the get all posts endpoint with multiple posts', async done => {
    const postData = {
      title: 'Test post',
      body: 'This is the body for a test post',
    };

    const response = await supertest(app)
      .post('/api/posts')
      .send(postData);

    expect(response.status).toBe(201);

    const response2 = await supertest(app)
      .post('/api/posts')
      .send(postData);

    expect(response2.status).toBe(201);

    const response3 = await supertest(app).get('/api/posts');
    expect(response3.status).toBe(200);
    const createdPost = response3.body;

    expect(createdPost[0].title).toBe(postData.title);
    expect(createdPost[0].body).toBe(postData.body);

    expect(createdPost[0].upvotes_clap).toBe(0);
    expect(createdPost[0].upvotes_laugh).toBe(0);
    expect(createdPost[0].upvotes_sad).toBe(0);

    expect(createdPost[1].title).toBe(postData.title);
    expect(createdPost[1].body).toBe(postData.body);

    expect(createdPost[1].upvotes_clap).toBe(0);
    expect(createdPost[1].upvotes_laugh).toBe(0);
    expect(createdPost[1].upvotes_sad).toBe(0);

    done();
  });

  /* Tests for create post API */
  it('tests the create post endpoint and returns as success message', async done => {
    const postData = {
      title: 'Test post',
      body: 'This is the body for a test post',
    };

    const response = await supertest(app)
      .post('/api/posts')
      .send(postData);

    expect(response.status).toBe(201);

    const createdPost = response.body;

    expect(createdPost.title).toBe(postData.title);
    expect(createdPost.body).toBe(postData.body);

    expect(createdPost.upvotes_clap).toBe(0);
    expect(createdPost.upvotes_laugh).toBe(0);
    expect(createdPost.upvotes_sad).toBe(0);

    done();
  });

  it('tests the create post endpoint with no title and returns as error message', async done => {
    const postData = {};

    const response = await supertest(app)
      .post('/api/posts')
      .send(postData);

    expect(response.status).toBe(400);
    done();
  });

  /* Tests for updating post API */
  it('update post successfully', async done => {
    // create post
    const postData = {
      title: 'First Title',
      body: 'First body',
    };

    const response1 = await supertest(app)
      .post('/api/posts')
      .send(postData);
    expect(response1.status).toBe(201);

    // update the post
    const updatedPost = {
      title: 'Second Title',
      body: 'Second Body',
    };

    const url = '/api/posts/';
    const response2 = await supertest(app)
      .put(url.concat(response1.body._id))
      .send({ title: updatedPost.title, body: updatedPost.body });
    expect(response2.status).toBe(200);

    // check if the database was updated
    // TODO change to fetch specific post once endpoint implemented
    const response3 = await supertest(app).get(url);
    expect(response3.body[0].title).toBe(updatedPost.title);
    expect(response3.body[0].body).toBe(updatedPost.body);
    done();
  });

  it('update post with invalid id returns error', async done => {
    // database is empty so 404 expected
    const updatedPost = {
      title: 'Second Title',
      body: 'Second Body',
    };

    const url = '/api/posts/';
    const response2 = await supertest(app)
      .put(url.concat('100'))
      .send({ title: updatedPost.title, body: updatedPost.body });
    expect(response2.status).toBe(404);
    done();
  });

  it('update post with missing title and body', async done => {
    // create post
    const postData = {
      title: 'First Title',
      body: 'First body',
    };

    const response1 = await supertest(app)
      .post('/api/posts')
      .send(postData);
    expect(response1.status).toBe(201);

    const updatedPost = {};

    const url = '/api/posts/';
    const response2 = await supertest(app)
      .put(url.concat(response1.body._id))
      .send(updatedPost);
    expect(response2.status).toBe(400);

    // check that the database wasn't updated
    const response3 = await supertest(app).get(url);
    expect(response3.body[0].title).toBe(postData.title);
    expect(response3.body[0].body).toBe(postData.body);
    done();
  });

  /* Tests for get detailed post API */
  it('tests the get single post route', async done => {
    const postData = {
      title: 'Test post',
      body: 'This is the body for a test post',
    };

    const response = await supertest(app)
      .post('/api/posts')
      .send(postData);

    expect(response.status).toBe(201);

    const createdPost = response.body;
    const url = '/api/posts/';

    const response2 = await supertest(app).get(url.concat('/', createdPost._id));
    expect(response2.status).toBe(200);
    // confirm post body fields
    expect(response2.body._id).toBe(createdPost._id);
    expect(response2.body.title).toBe(postData.title);
    expect(response2.body.body).toBe(postData.body);
    expect(response2.body.date_created).toBeDefined();
    expect(response2.body.upvotes_clap).toBe(0);
    expect(response2.body.upvotes_laugh).toBe(0);
    expect(response2.body.upvotes_sad).toBe(0);
    // confirm there are no comments
    expect(response2.body.comments).toMatchObject([]);
    done();
  });

  it('tests the get single post route', async done => {
    const postData = {
      title: 'Test post',
      body: 'This is the body for a test post',
    };

    const response = await supertest(app)
      .post('/api/posts')
      .send(postData);

    expect(response.status).toBe(201);

    const createdPost = response.body;
    const commentUrl = '/api/comments';
    const postUrl = '/api/posts';
    const commentData = {
      body: 'This is the body for a test comment',
      parentID: createdPost._id,
    };

    const response1 = await supertest(app)
      .post(commentUrl)
      .send(commentData);

    expect(response1.status).toBe(201);

    const response2 = await supertest(app).get(postUrl.concat('/', createdPost._id));
    expect(response2.status).toBe(200);
    // confirm post body fields
    expect(response2.body._id).toBe(createdPost._id);
    expect(response2.body.title).toBe(postData.title);
    expect(response2.body.body).toBe(postData.body);
    expect(response2.body.date_created).toBeDefined();
    expect(response2.body.upvotes_clap).toBe(0);
    expect(response2.body.upvotes_laugh).toBe(0);
    expect(response2.body.upvotes_sad).toBe(0);
    // confirm comment #1 fields
    expect(response2.body.comments[0]._id).toBeDefined();
    expect(response2.body.comments[0].body).toBe(commentData.body);
    expect(response2.body.comments[0].date_created).toBeDefined();
    done();
  });

  it('tests the get single post route with two comment objects', async done => {
    const postData = {
      title: 'Test post',
      body: 'This is the body for a test post',
    };

    const response = await supertest(app)
      .post('/api/posts')
      .send(postData);

    expect(response.status).toBe(201);

    const createdPost = response.body;

    const commentUrl = '/api/comments';
    const postUrl = '/api/posts';
    const commentData = {
      body: 'This is the body for a test comment',
      parentID: createdPost._id,
    };
    const commentData2 = {
      body: 'This is the body for a test comment',
      parentID: createdPost._id,
    };

    const response1 = await supertest(app)
      .post(commentUrl)
      .send(commentData);

    expect(response1.status).toBe(201);

    const response2 = await supertest(app).get(postUrl.concat('/', createdPost._id));
    expect(response2.status).toBe(200);
    expect(response2.body._id).toBe(createdPost._id);
    expect(response2.body.title).toBe(postData.title);
    expect(response2.body.body).toBe(postData.body);
    expect(response2.body.date_created).toBeDefined();
    expect(response2.body.upvotes_clap).toBe(0);
    expect(response2.body.upvotes_laugh).toBe(0);
    expect(response2.body.upvotes_sad).toBe(0);
    expect(response2.body.comments[0]._id).toBeDefined();
    expect(response2.body.comments[0].body).toBe(commentData.body);
    expect(response2.body.comments[0].date_created).toBeDefined();

    const response3 = await supertest(app)
      .post(commentUrl)
      .send(commentData2);

    expect(response3.status).toBe(201);

    const response4 = await supertest(app).get(postUrl.concat('/', createdPost._id));
    expect(response4.status).toBe(200);
    expect(response4.body._id).toBe(createdPost._id);
    expect(response4.body.title).toBe(postData.title);
    expect(response4.body.body).toBe(postData.body);
    expect(response4.body.date_created).toBeDefined();
    expect(response4.body.upvotes_clap).toBe(0);
    expect(response4.body.upvotes_laugh).toBe(0);
    expect(response4.body.upvotes_sad).toBe(0);
    // confirm comment #1 fields
    expect(response4.body.comments[0]._id).toBeDefined();
    expect(response4.body.comments[0].body).toBe(commentData.body);
    expect(response4.body.comments[0].date_created).toBeDefined();
    // confirm comment #2 fields
    expect(response4.body.comments[1]._id).toBeDefined();
    expect(response4.body.comments[1].body).toBe(commentData2.body);
    expect(response4.body.comments[1].date_created).toBeDefined();
    done();
  });

  it('tests the get single post route', async done => {
    const postData = {
      title: 'Test post',
      body: 'This is the body for a test post',
    };

    const response = await supertest(app)
      .post('/api/posts')
      .send(postData);

    expect(response.status).toBe(201);

    const createdPost = response.body;
    const url = '/api/posts/';

    const response2 = await supertest(app).get(url.concat('/', createdPost._id + 3));
    expect(response2.status).toBe(404);
    done();
  });

  /* Tests for delete post API */
  it('tests the delete post method', async done => {
    // create post
    const postData = {
      title: 'Test post',
      body: 'This is the body for a test post',
    };

    const response = await supertest(app)
      .post('/api/posts')
      .send(postData);
    expect(response.status).toBe(201);
    const createdPost = response.body;
    const url = '/api/posts/';

    const response1 = await supertest(app).delete(url.concat(createdPost._id));

    expect(response1.status).toBe(200);

    // confirm post deletion
    const response3 = await supertest(app).get(url);

    expect(response3.body).toMatchObject([]);
    done();
  });

  it('tests the deletion of already deleted post', async done => {
    // create post
    const postData = {
      title: 'Test post',
      body: 'This is the body for a test post',
    };

    const response = await supertest(app)
      .post('/api/posts')
      .send(postData);

    expect(response.status).toBe(201);
    const createdPost = response.body;
    const url = '/api/posts/';

    const response1 = await supertest(app).delete(url.concat(createdPost._id));
    expect(response1.status).toBe(200);

    const response3 = await supertest(app).get(url);

    expect(response3.body).toMatchObject([]);

    // response for deleting a post that's already deleted is 400 because there is no valid author
    // for a non-existent post
    const response2 = await supertest(app).delete(url.concat(createdPost._id));

    expect(response2.status).toBe(400);

    // confirm post is still deleted
    const response4 = await supertest(app).get(url);

    expect(response4.body).toMatchObject([]);
    done();
  });

  it('tests the delete route with no defined post id', async done => {
    const postData = {};

    const url = '/api/posts/';

    const response = await supertest(app).delete(url.concat(postData));

    expect(response.status).toBe(400);
    done();
  });

  it('tests the delete post method with an incorrect post id in url', async done => {
    const postData = {
      title: 'Test post',
      body: 'This is the body for a test post',
    };

    const response = await supertest(app)
      .post('/api/posts')
      .send(postData);

    const createdPost = response.body;
    const url = '/api/posts/';

    const response1 = await supertest(app).delete(url.concat(createdPost._id + 3));

    expect(response1.status).toBe(400);
    done();
  });

  /* Tests for upvote API */
  it('upvote post successfully', async done => {
    // create post
    const postData = {
      title: 'Test post',
      body: 'This is the body for a test post',
    };

    const response = await supertest(app)
      .post('/api/posts')
      .send(postData);

    expect(response.status).toBe(201);

    // Get post
    const response2 = await supertest(app).get('/api/posts');
    const testId = response2.body[0]._id;

    // Upvote the post
    const upvoteRequest = {
      id: testId,
      upvote_type: 'clap',
      upvote: true,
    };

    const response3 = await supertest(app)
      .put(`/api/posts/${testId}/upvote`)
      .send(upvoteRequest);
    expect(response3.status).toBe(200);

    expect(response3.body._id).toBe(testId);
    expect(response3.body.title).toBe(postData.title);
    expect(response3.body.body).toBe(postData.body);
    expect(response3.body.date_created).toBeDefined();
    expect(response3.body.upvotes_clap).toBe(1);
    expect(response3.body.upvotes_laugh).toBe(0);
    expect(response3.body.upvotes_sad).toBe(0);
    done();
  });

  it('upvote post with invalid type fails', async done => {
    // create post
    const postData = {
      title: 'Test post',
      body: 'This is the body for a test post',
    };

    const response = await supertest(app)
      .post('/api/posts')
      .send(postData);
    expect(response.status).toBe(201);

    // Get post
    const response2 = await supertest(app).get('/api/posts');

    // Upvote the post
    const upvoteRequest = {
      id: response2.body[0]._id,
      upvote_type: 'claps',
      upvote: true,
    };

    const response3 = await supertest(app)
      .put(`/api/posts/${response2.body[0]._id}/upvote`)
      .send(upvoteRequest);
    expect(response3.status).toBe(400);

    // Check if post was upvoted
    const response4 = await supertest(app).get('/api/posts');
    expect(response4.body[0].upvotes_clap).toBe(0);
    done();
  });

  it('downvote post successfully', async done => {
    // create post
    const postData = {
      title: 'Test post',
      body: 'This is the body for a test post',
    };

    const response = await supertest(app)
      .post('/api/posts')
      .send(postData);
    expect(response.status).toBe(201);

    // Get post
    const response2 = await supertest(app).get('/api/posts');
    const testId = response2.body[0]._id;

    const upvoteRequest1 = {
      id: testId,
      upvote_type: 'clap',
      upvote: true,
    };

    const response4 = await supertest(app)
      .put(`/api/posts/${testId}/upvote`)
      .send(upvoteRequest1);
    expect(response4.status).toBe(200);

    expect(response4.body._id).toBe(testId);
    expect(response4.body.title).toBe(postData.title);
    expect(response4.body.body).toBe(postData.body);
    expect(response4.body.date_created).toBeDefined();
    expect(response4.body.upvotes_clap).toBe(1);
    expect(response4.body.upvotes_laugh).toBe(0);
    expect(response4.body.upvotes_sad).toBe(0);

    // Upvote the post
    const upvoteRequest = {
      id: testId,
      upvote_type: 'clap',
      upvote: false,
    };

    const response3 = await supertest(app)
      .put(`/api/posts/${testId}/upvote`)
      .send(upvoteRequest);
    expect(response3.status).toBe(200);

    expect(response3.body._id).toBe(testId);
    expect(response3.body.title).toBe(postData.title);
    expect(response3.body.body).toBe(postData.body);
    expect(response3.body.date_created).toBeDefined();
    expect(response3.body.upvotes_clap).toBe(0);
    expect(response3.body.upvotes_laugh).toBe(0);
    expect(response3.body.upvotes_sad).toBe(0);
    done();
  });

  it('downvote post with invalid type fails', async done => {
    // create post
    const postData = {
      title: 'Test post',
      body: 'This is the body for a test post',
    };

    const response = await supertest(app)
      .post('/api/posts')
      .send(postData);
    expect(response.status).toBe(201);

    // Get post
    const response2 = await supertest(app).get('/api/posts');

    // Upvote the post
    const upvoteRequest = {
      id: response2.body[0]._id,
      upvote_type: 'claps',
      upvote: false,
    };

    const response3 = await supertest(app)
      .put(`/api/posts/${response2.body[0]._id}/upvote`)
      .send(upvoteRequest);
    expect(response3.status).toBe(400);

    // Check if post was upvoted
    const response4 = await supertest(app).get('/api/posts');
    expect(response4.body[0].upvotes_clap).toBe(0);
    done();
  });

  it('upvote post successfully', async done => {
    // create post
    const postData = {
      title: 'Test post',
      body: 'This is the body for a test post',
    };

    const response = await supertest(app)
      .post('/api/posts')
      .send(postData);

    expect(response.status).toBe(201);

    // Get post
    const response2 = await supertest(app).get('/api/posts');
    const testId = response2.body[0]._id;

    // Upvote the post
    const upvoteRequest = {
      id: testId,
      upvote_type: 'laugh',
      upvote: true,
    };

    const response3 = await supertest(app)
      .put(`/api/posts/${testId}/upvote`)
      .send(upvoteRequest);
    expect(response3.status).toBe(200);

    expect(response3.body._id).toBe(testId);
    expect(response3.body.title).toBe(postData.title);
    expect(response3.body.body).toBe(postData.body);
    expect(response3.body.date_created).toBeDefined();
    expect(response3.body.upvotes_clap).toBe(0);
    expect(response3.body.upvotes_laugh).toBe(1);
    expect(response3.body.upvotes_sad).toBe(0);
    done();
  });

  it('remove vote successfully', async done => {
    // create post
    const postData = {
      title: 'Test post',
      body: 'This is the body for a test post',
    };

    const response = await supertest(app)
      .post('/api/posts')
      .send(postData);
    expect(response.status).toBe(201);

    // Get post
    const response2 = await supertest(app).get('/api/posts');
    const testId = response2.body[0]._id;

    // Upvote the post
    const upvoteRequest = {
      id: testId,
      upvote_type: 'laugh',
      upvote: true,
    };

    const response4 = await supertest(app)
      .put(`/api/posts/${testId}/upvote`)
      .send(upvoteRequest);
    expect(response4.status).toBe(200);

    expect(response4.body._id).toBe(testId);
    expect(response4.body.title).toBe(postData.title);
    expect(response4.body.body).toBe(postData.body);
    expect(response4.body.date_created).toBeDefined();
    expect(response4.body.upvotes_clap).toBe(0);
    expect(response4.body.upvotes_laugh).toBe(1);
    expect(response4.body.upvotes_sad).toBe(0);

    // Downvote the post
    const upvoteRequest1 = {
      id: testId,
      upvote_type: 'laugh',
      upvote: false,
    };

    const response3 = await supertest(app)
      .put(`/api/posts/${testId}/upvote`)
      .send(upvoteRequest1);
    expect(response3.status).toBe(200);

    expect(response3.body._id).toBe(testId);
    expect(response3.body.title).toBe(postData.title);
    expect(response3.body.body).toBe(postData.body);
    expect(response3.body.date_created).toBeDefined();
    expect(response3.body.upvotes_clap).toBe(0);
    expect(response3.body.upvotes_laugh).toBe(0);
    expect(response3.body.upvotes_sad).toBe(0);
    done();
  });

  it('upvote post successfully', async done => {
    // create post
    const postData = {
      title: 'Test post',
      body: 'This is the body for a test post',
    };

    const response = await supertest(app)
      .post('/api/posts')
      .send(postData);

    expect(response.status).toBe(201);

    // Get post
    const response2 = await supertest(app).get('/api/posts');
    const testId = response2.body[0]._id;

    // Upvote the post
    const upvoteRequest = {
      id: testId,
      upvote_type: 'sad',
      upvote: true,
    };

    const response3 = await supertest(app)
      .put(`/api/posts/${testId}/upvote`)
      .send(upvoteRequest);
    expect(response3.status).toBe(200);

    expect(response3.body._id).toBe(testId);
    expect(response3.body.title).toBe(postData.title);
    expect(response3.body.body).toBe(postData.body);
    expect(response3.body.date_created).toBeDefined();
    expect(response3.body.upvotes_clap).toBe(0);
    expect(response3.body.upvotes_laugh).toBe(0);
    expect(response3.body.upvotes_sad).toBe(1);
    done();
  });

  it('downvote post successfully', async done => {
    // create post
    const postData = {
      title: 'Test post',
      body: 'This is the body for a test post',
    };

    const response = await supertest(app)
      .post('/api/posts')
      .send(postData);
    expect(response.status).toBe(201);

    // Get post
    const response2 = await supertest(app).get('/api/posts');
    const testId = response2.body[0]._id;

    const upvoteRequest1 = {
      id: testId,
      upvote_type: 'sad',
      upvote: true,
    };

    const response4 = await supertest(app)
      .put(`/api/posts/${testId}/upvote`)
      .send(upvoteRequest1);
    expect(response4.status).toBe(200);

    expect(response4.body._id).toBe(testId);
    expect(response4.body.title).toBe(postData.title);
    expect(response4.body.body).toBe(postData.body);
    expect(response4.body.date_created).toBeDefined();
    expect(response4.body.upvotes_clap).toBe(0);
    expect(response4.body.upvotes_laugh).toBe(0);
    expect(response4.body.upvotes_sad).toBe(1);

    // Upvote the post
    const upvoteRequest = {
      id: testId,
      upvote_type: 'sad',
      upvote: false,
    };

    const response3 = await supertest(app)
      .put(`/api/posts/${testId}/upvote`)
      .send(upvoteRequest);
    expect(response3.status).toBe(200);

    expect(response3.body._id).toBe(testId);
    expect(response3.body.title).toBe(postData.title);
    expect(response3.body.body).toBe(postData.body);
    expect(response3.body.date_created).toBeDefined();
    expect(response3.body.upvotes_clap).toBe(0);
    expect(response3.body.upvotes_laugh).toBe(0);
    expect(response3.body.upvotes_sad).toBe(0);
    done();
  });
});
