define('ghost-admin/tests/acceptance/authentication-test', ['exports', 'mocha', 'chai', 'ember', 'ghost-admin/tests/helpers/start-app', 'ghost-admin/tests/helpers/destroy-app', 'ghost-admin/tests/helpers/ember-simple-auth', 'ember-cli-mirage', 'ghost-admin/utils/window-proxy', 'ghost-admin/utils/ghost-paths'], function (exports, _mocha, _chai, _ember, _ghostAdminTestsHelpersStartApp, _ghostAdminTestsHelpersDestroyApp, _ghostAdminTestsHelpersEmberSimpleAuth, _emberCliMirage, _ghostAdminUtilsWindowProxy, _ghostAdminUtilsGhostPaths) {
    var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

    var Ghost = (0, _ghostAdminUtilsGhostPaths['default'])();

    (0, _mocha.describe)('Acceptance: Authentication', function () {
        var application = undefined,
            originalReplaceLocation = undefined;

        (0, _mocha.beforeEach)(function () {
            application = (0, _ghostAdminTestsHelpersStartApp['default'])();
        });

        (0, _mocha.afterEach)(function () {
            (0, _ghostAdminTestsHelpersDestroyApp['default'])(application);
        });

        (0, _mocha.describe)('general page', function () {
            (0, _mocha.beforeEach)(function () {
                originalReplaceLocation = _ghostAdminUtilsWindowProxy['default'].replaceLocation;
                _ghostAdminUtilsWindowProxy['default'].replaceLocation = function (url) {
                    visit(url);
                };

                server.loadFixtures();
                var role = server.create('role', { name: 'Administrator' });
                var user = server.create('user', { roles: [role], slug: 'test-user' });
            });

            (0, _mocha.afterEach)(function () {
                _ghostAdminUtilsWindowProxy['default'].replaceLocation = originalReplaceLocation;
            });

            (0, _mocha.it)('invalidates session on 401 API response', function () {
                // return a 401 when attempting to retrieve users
                server.get('/users/', function (db, request) {
                    return new _emberCliMirage['default'].Response(401, {}, {
                        errors: [{ message: 'Access denied.', errorType: 'UnauthorizedError' }]
                    });
                });

                (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
                visit('/team');

                andThen(function () {
                    (0, _chai.expect)(currentURL(), 'url after 401').to.equal('/signin');
                });
            });

            (0, _mocha.it)('doesn\'t show navigation menu on invalid url when not authenticated', function () {
                (0, _ghostAdminTestsHelpersEmberSimpleAuth.invalidateSession)(application);

                visit('/');

                andThen(function () {
                    (0, _chai.expect)(currentURL(), 'current url').to.equal('/signin');
                    (0, _chai.expect)(find('nav.gh-nav').length, 'nav menu presence').to.equal(0);
                });

                visit('/signin/invalidurl/');

                andThen(function () {
                    (0, _chai.expect)(currentURL(), 'url after invalid url').to.equal('/signin/invalidurl/');
                    (0, _chai.expect)(currentPath(), 'path after invalid url').to.equal('error404');
                    (0, _chai.expect)(find('nav.gh-nav').length, 'nav menu presence').to.equal(0);
                });
            });

            (0, _mocha.it)('shows nav menu on invalid url when authenticated', function () {
                (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
                visit('/signin/invalidurl/');

                andThen(function () {
                    (0, _chai.expect)(currentURL(), 'url after invalid url').to.equal('/signin/invalidurl/');
                    (0, _chai.expect)(currentPath(), 'path after invalid url').to.equal('error404');
                    (0, _chai.expect)(find('nav.gh-nav').length, 'nav menu presence').to.equal(1);
                });
            });
        });

        (0, _mocha.describe)('editor', function () {
            var origDebounce = _ember['default'].run.debounce;
            var origThrottle = _ember['default'].run.throttle;

            // we don't want the autosave interfering in this test
            (0, _mocha.beforeEach)(function () {
                _ember['default'].run.debounce = function () {};
                _ember['default'].run.throttle = function () {};
            });

            (0, _mocha.it)('displays re-auth modal attempting to save with invalid session', function () {
                var role = server.create('role', { name: 'Administrator' });
                var user = server.create('user', { roles: [role] });

                // simulate an invalid session when saving the edited post
                server.put('/posts/:id/', function (db, request) {
                    var post = db.posts.find(request.params.id);

                    var _JSON$parse$posts = _slicedToArray(JSON.parse(request.requestBody).posts, 1);

                    var attrs = _JSON$parse$posts[0];

                    if (attrs.markdown === 'Edited post body') {
                        return new _emberCliMirage['default'].Response(401, {}, {
                            errors: [{ message: 'Access denied.', errorType: 'UnauthorizedError' }]
                        });
                    } else {
                        return {
                            posts: [post]
                        };
                    }
                });

                server.loadFixtures();
                (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);

                visit('/editor');

                // create the post
                fillIn('#entry-title', 'Test Post');
                fillIn('textarea.markdown-editor', 'Test post body');
                click('.js-publish-button');

                andThen(function () {
                    // we shouldn't have a modal at this point
                    (0, _chai.expect)(find('.modal-container #login').length, 'modal exists').to.equal(0);
                    // we also shouldn't have any alerts
                    (0, _chai.expect)(find('.gh-alert').length, 'no of alerts').to.equal(0);
                });

                // update the post
                fillIn('textarea.markdown-editor', 'Edited post body');
                click('.js-publish-button');

                andThen(function () {
                    // we should see a re-auth modal
                    (0, _chai.expect)(find('.fullscreen-modal #login').length, 'modal exists').to.equal(1);
                });
            });

            // don't clobber debounce/throttle for future tests
            (0, _mocha.afterEach)(function () {
                _ember['default'].run.debounce = origDebounce;
                _ember['default'].run.throttle = origThrottle;
            });
        });

        (0, _mocha.it)('adds auth headers to jquery ajax', function (done) {
            var role = server.create('role', { name: 'Administrator' });
            var user = server.create('user', { roles: [role] });

            server.post('/uploads', function (db, request) {
                return request;
            });
            server.loadFixtures();

            // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application, {
                access_token: 'test_token',
                expires_in: 3600,
                token_type: 'Bearer'
            });
            // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

            // necessary to visit a page to fully boot the app in testing
            visit('/').andThen(function () {
                $.ajax({
                    type: 'POST',
                    url: Ghost.apiRoot + '/uploads/',
                    data: { test: 'Test' }
                }).then(function (request) {
                    (0, _chai.expect)(request.requestHeaders.Authorization, 'Authorization header').to.exist;
                    (0, _chai.expect)(request.requestHeaders.Authorization, 'Authotization header content').to.equal('Bearer test_token');
                }).always(function () {
                    done();
                });
            });
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/acceptance/editor-test', ['exports', 'mocha', 'chai', 'ghost-admin/tests/helpers/start-app', 'ghost-admin/tests/helpers/destroy-app', 'ghost-admin/tests/helpers/ember-simple-auth', 'ember-cli-mirage'], function (exports, _mocha, _chai, _ghostAdminTestsHelpersStartApp, _ghostAdminTestsHelpersDestroyApp, _ghostAdminTestsHelpersEmberSimpleAuth, _emberCliMirage) {

    (0, _mocha.describe)('Acceptance: Editor', function () {
        var application = undefined;

        (0, _mocha.beforeEach)(function () {
            application = (0, _ghostAdminTestsHelpersStartApp['default'])();
        });

        (0, _mocha.afterEach)(function () {
            (0, _ghostAdminTestsHelpersDestroyApp['default'])(application);
        });

        (0, _mocha.it)('redirects to signin when not authenticated', function () {
            (0, _ghostAdminTestsHelpersEmberSimpleAuth.invalidateSession)(application);
            visit('/editor/1');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/signin');
            });
        });

        (0, _mocha.it)('does not redirect to team page when authenticated as author', function () {
            var role = server.create('role', { name: 'Author' });
            var user = server.create('user', { roles: [role], slug: 'test-user' });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            visit('/editor/1');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/editor/1');
            });
        });

        (0, _mocha.it)('does not redirect to team page when authenticated as editor', function () {
            var role = server.create('role', { name: 'Editor' });
            var user = server.create('user', { roles: [role], slug: 'test-user' });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            visit('/editor/1');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/editor/1');
            });
        });

        (0, _mocha.describe)('when logged in', function () {
            (0, _mocha.beforeEach)(function () {
                var role = server.create('role', { name: 'Administrator' });
                var user = server.create('user', { roles: [role] });

                server.loadFixtures();

                return (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            });

            (0, _mocha.it)('renders the editor correctly, PSM Publish Date and Save Button', function () {
                var posts = server.createList('post', 3);

                // post id 1 is a draft, checking for draft behaviour now
                visit('/editor/1');

                andThen(function () {
                    (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/editor/1');
                });

                // should error, if the date input is in a wrong format
                fillIn('input[name="post-setting-date"]', 'testdate');
                triggerEvent('input[name="post-setting-date"]', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('.ember-view.response').text().trim(), 'inline error response for invalid date').to.equal('Published Date must be a valid date with format: DD MMM YY @ HH:mm (e.g. 6 Dec 14 @ 15:00)');
                });

                // saves the post with the new date
                fillIn('input[name="post-setting-date"]', '10 May 16 @ 10:00');
                triggerEvent('input[name="post-setting-date"]', 'blur');
                // saving
                click('.view-header .btn.btn-sm.js-publish-button');

                andThen(function () {
                    (0, _chai.expect)(find('input[name="post-setting-date"]').val(), 'date after saving').to.equal('10 May 16 @ 10:00');
                });

                // should not do anything if the input date is not different
                fillIn('input[name="post-setting-date"]', '10 May 16 @ 10:00');
                triggerEvent('input[name="post-setting-date"]', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('input[name="post-setting-date"]').val(), 'date didn\'t change').to.equal('10 May 16 @ 10:00');
                });

                // checking the flow of the saving button for a draft
                andThen(function () {
                    (0, _chai.expect)(find('.view-header .btn.btn-sm.js-publish-button').hasClass('btn-red'), 'no red button expected').to.be['false'];
                    (0, _chai.expect)(find('.view-header .btn.btn-sm.js-publish-button').text().trim(), 'text in save button').to.equal('Save Draft');
                    (0, _chai.expect)(find('.post-save-draft').hasClass('active'), 'highlights the default active button state for a draft').to.be['true'];
                });

                // click on publish now
                click('.post-save-publish a');

                andThen(function () {
                    (0, _chai.expect)(find('.post-save-publish').hasClass('active'), 'highlights the selected active button state').to.be['true'];
                    (0, _chai.expect)(find('.view-header .btn.btn-sm.js-publish-button').hasClass('btn-red'), 'red button to change from draft to published').to.be['true'];
                    (0, _chai.expect)(find('.view-header .btn.btn-sm.js-publish-button').text().trim(), 'text in save button after click on \'publish now\'').to.equal('Publish Now');
                });

                // Publish the post
                click('.view-header .btn.btn-sm.js-publish-button');

                andThen(function () {
                    (0, _chai.expect)(find('.view-header .btn.btn-sm.js-publish-button').text().trim(), 'text in save button after publishing').to.equal('Update Post');
                    (0, _chai.expect)(find('.post-save-publish').hasClass('active'), 'highlights the default active button state for a published post').to.be['true'];
                    (0, _chai.expect)(find('.view-header .btn.btn-sm.js-publish-button').hasClass('btn-red'), 'no red button expected').to.be['false'];
                });

                // post id 2 is a published post, checking for published post behaviour now
                visit('/editor/2');

                andThen(function () {
                    (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/editor/2');
                    (0, _chai.expect)(find('input[name="post-setting-date"]').val()).to.equal('19 Dec 15 @ 16:25');
                });

                // should reset the date if the input field is blank
                fillIn('input[name="post-setting-date"]', '');
                triggerEvent('input[name="post-setting-date"]', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('input[name="post-setting-date"]').val(), 'empty date input').to.equal('');
                });

                // saving
                click('.view-header .btn.btn-sm.js-publish-button');

                andThen(function () {
                    (0, _chai.expect)(find('input[name="post-setting-date"]').val(), 'date value restored').to.equal('19 Dec 15 @ 16:25');
                });

                // saves the post with a new date
                fillIn('input[name="post-setting-date"]', '10 May 16 @ 10:00');
                triggerEvent('input[name="post-setting-date"]', 'blur');
                // saving
                click('.view-header .btn.btn-sm.js-publish-button');

                andThen(function () {
                    (0, _chai.expect)(find('input[name="post-setting-date"]').val(), 'new date after saving').to.equal('10 May 16 @ 10:00');
                });

                // should not do anything if the input date is not different
                fillIn('input[name="post-setting-date"]', '10 May 16 @ 10:00');
                triggerEvent('input[name="post-setting-date"]', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('input[name="post-setting-date"]').val(), 'date didn\'t change').to.equal('10 May 16 @ 10:00');
                });

                andThen(function () {
                    (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/editor/2');
                    (0, _chai.expect)(find('.view-header .btn.btn-sm.js-publish-button').hasClass('btn-red'), 'no red button expected').to.be['false'];
                    (0, _chai.expect)(find('.view-header .btn.btn-sm.js-publish-button').text().trim(), 'text in save button for published post').to.equal('Update Post');
                    (0, _chai.expect)(find('.post-save-publish').hasClass('active'), 'highlights the default active button state for a published post').to.be['true'];
                });

                // click on unpublish
                click('.post-save-draft a');

                andThen(function () {
                    (0, _chai.expect)(find('.post-save-draft').hasClass('active'), 'highlights the active button state for a draft').to.be['true'];
                    (0, _chai.expect)(find('.view-header .btn.btn-sm.js-publish-button').hasClass('btn-red'), 'red button to change from published to draft').to.be['true'];
                    (0, _chai.expect)(find('.view-header .btn.btn-sm.js-publish-button').text().trim(), 'text in save button for post to unpublish').to.equal('Unpublish');
                });

                // Unpublish the post
                click('.view-header .btn.btn-sm.js-publish-button');

                andThen(function () {
                    (0, _chai.expect)(find('.view-header .btn.btn-sm.js-publish-button').text().trim(), 'text in save button for draft').to.equal('Save Draft');
                    (0, _chai.expect)(find('.post-save-draft').hasClass('active'), 'highlights the default active button state for a draft').to.be['true'];
                    (0, _chai.expect)(find('.view-header .btn.btn-sm.js-publish-button').hasClass('btn-red'), 'no red button expected').to.be['false'];
                });

                // go to settings to change the timezone
                visit('/settings/general');

                andThen(function () {
                    (0, _chai.expect)(currentURL(), 'currentURL for settings').to.equal('/settings/general');
                    (0, _chai.expect)(find('#activeTimezone option:selected').text().trim(), 'default timezone').to.equal('(GMT) Greenwich Mean Time : Dublin, Edinburgh, London');
                    // select a new timezone
                    find('#activeTimezone option[value="Pacific/Auckland"]').prop('selected', true);
                });

                triggerEvent('#activeTimezone select', 'change');
                // save the settings
                click('.view-header .btn.btn-blue');

                andThen(function () {
                    (0, _chai.expect)(find('#activeTimezone option:selected').text().trim(), 'new timezone after saving').to.equal('(GMT +13:00) Auckland, Wellington');
                });

                // and now go back to the editor
                visit('/editor/2');

                andThen(function () {
                    (0, _chai.expect)(currentURL(), 'currentURL in editor').to.equal('/editor/2');
                    (0, _chai.expect)(find('input[name="post-setting-date"]').val(), 'date with timezone offset').to.equal('10 May 16 @ 21:00');
                });
            });
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/acceptance/password-reset-test', ['exports', 'mocha', 'chai', 'ghost-admin/tests/helpers/start-app', 'ghost-admin/tests/helpers/destroy-app'], function (exports, _mocha, _chai, _ghostAdminTestsHelpersStartApp, _ghostAdminTestsHelpersDestroyApp) {

    (0, _mocha.describe)('Acceptance: Password Reset', function () {
        var application = undefined;

        (0, _mocha.beforeEach)(function () {
            application = (0, _ghostAdminTestsHelpersStartApp['default'])();
        });

        (0, _mocha.afterEach)(function () {
            (0, _ghostAdminTestsHelpersDestroyApp['default'])(application);
        });

        (0, _mocha.describe)('request reset', function () {
            (0, _mocha.it)('is successful with valid data', function () {
                visit('/signin');
                fillIn('input[name="identification"]', 'test@example.com');
                click('.forgotten-link');

                andThen(function () {
                    // an alert with instructions is displayed
                    (0, _chai.expect)(find('.gh-alert-blue').length, 'alert count').to.equal(1);
                });
            });

            (0, _mocha.it)('shows error messages with invalid data', function () {
                visit('/signin');

                // no email provided
                click('.forgotten-link');

                andThen(function () {
                    // email field is invalid
                    (0, _chai.expect)(find('input[name="identification"]').closest('.form-group').hasClass('error'), 'email field has error class (no email)').to.be['true'];

                    // password field is valid
                    (0, _chai.expect)(find('input[name="password"]').closest('.form-group').hasClass('error'), 'password field has error class (no email)').to.be['false'];

                    // error message shown
                    (0, _chai.expect)(find('p.main-error').text().trim(), 'error message').to.equal('We need your email address to reset your password!');
                });

                // invalid email provided
                fillIn('input[name="identification"]', 'test');
                click('.forgotten-link');

                andThen(function () {
                    // email field is invalid
                    (0, _chai.expect)(find('input[name="identification"]').closest('.form-group').hasClass('error'), 'email field has error class (invalid email)').to.be['true'];

                    // password field is valid
                    (0, _chai.expect)(find('input[name="password"]').closest('.form-group').hasClass('error'), 'password field has error class (invalid email)').to.be['false'];

                    // error message
                    (0, _chai.expect)(find('p.main-error').text().trim(), 'error message').to.equal('We need your email address to reset your password!');
                });

                // unknown email provided
                fillIn('input[name="identification"]', 'unknown@example.com');
                click('.forgotten-link');

                andThen(function () {
                    // email field is invalid
                    (0, _chai.expect)(find('input[name="identification"]').closest('.form-group').hasClass('error'), 'email field has error class (unknown email)').to.be['true'];

                    // password field is valid
                    (0, _chai.expect)(find('input[name="password"]').closest('.form-group').hasClass('error'), 'password field has error class (unknown email)').to.be['false'];

                    // error message
                    (0, _chai.expect)(find('p.main-error').text().trim(), 'error message').to.equal('There is no user with that email address.');
                });
            });
        });

        // TODO: add tests for the change password screen
    });
});
/* jshint expr:true */
define('ghost-admin/tests/acceptance/posts/post-test', ['exports', 'mocha', 'chai', 'ghost-admin/tests/helpers/start-app', 'ghost-admin/tests/helpers/destroy-app', 'ghost-admin/tests/helpers/ember-simple-auth', 'ghost-admin/tests/helpers/adapter-error', 'ember-cli-mirage'], function (exports, _mocha, _chai, _ghostAdminTestsHelpersStartApp, _ghostAdminTestsHelpersDestroyApp, _ghostAdminTestsHelpersEmberSimpleAuth, _ghostAdminTestsHelpersAdapterError, _emberCliMirage) {

    (0, _mocha.describe)('Acceptance: Posts - Post', function () {
        var application = undefined;

        (0, _mocha.beforeEach)(function () {
            application = (0, _ghostAdminTestsHelpersStartApp['default'])();
        });

        (0, _mocha.afterEach)(function () {
            (0, _ghostAdminTestsHelpersDestroyApp['default'])(application);
        });

        (0, _mocha.describe)('when logged in', function () {
            (0, _mocha.beforeEach)(function () {
                var role = server.create('role', { name: 'Administrator' });
                var user = server.create('user', { roles: [role] });

                // load the settings fixtures
                // TODO: this should always be run for acceptance tests
                server.loadFixtures();

                return (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            });

            (0, _mocha.it)('can visit post route', function () {
                var posts = server.createList('post', 3);

                visit('/');

                andThen(function () {
                    (0, _chai.expect)(find('.posts-list li').length, 'post list count').to.equal(3);

                    // if we're in "desktop" size, we should redirect and highlight
                    if (find('.content-preview:visible').length) {
                        (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/' + posts[0].id);
                        // expect(find('.posts-list li').first().hasClass('active'), 'highlights latest post').to.be.true;
                    }
                });

                // check if we can edit the post
                click('.post-edit');

                andThen(function () {
                    (0, _chai.expect)(currentURL(), 'currentURL to editor').to.equal('/editor/1');
                });

                // TODO: test the right order of the listes posts
                //  and fix the faker import to ensure correct ordering
            });

            (0, _mocha.it)('redirects to 404 when post does not exist', function () {
                server.get('/posts/200/', function () {
                    return new _emberCliMirage['default'].Response(404, { 'Content-Type': 'application/json' }, { errors: [{ message: 'Post not found.', errorType: 'NotFoundError' }] });
                });

                (0, _ghostAdminTestsHelpersAdapterError.errorOverride)();

                visit('/200');

                andThen(function () {
                    (0, _ghostAdminTestsHelpersAdapterError.errorReset)();
                    (0, _chai.expect)(currentPath()).to.equal('error404');
                    (0, _chai.expect)(currentURL()).to.equal('/200');
                });
            });
        });
    });
});
/* jshint expr:true */
/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
define('ghost-admin/tests/acceptance/settings/apps-test', ['exports', 'mocha', 'chai', 'ember', 'ghost-admin/tests/helpers/start-app', 'ghost-admin/tests/helpers/destroy-app', 'ghost-admin/tests/helpers/ember-simple-auth'], function (exports, _mocha, _chai, _ember, _ghostAdminTestsHelpersStartApp, _ghostAdminTestsHelpersDestroyApp, _ghostAdminTestsHelpersEmberSimpleAuth) {
    var run = _ember['default'].run;

    (0, _mocha.describe)('Acceptance: Settings - Apps', function () {
        var application = undefined;

        (0, _mocha.beforeEach)(function () {
            application = (0, _ghostAdminTestsHelpersStartApp['default'])();
        });

        (0, _mocha.afterEach)(function () {
            (0, _ghostAdminTestsHelpersDestroyApp['default'])(application);
        });

        (0, _mocha.it)('redirects to signin when not authenticated', function () {
            (0, _ghostAdminTestsHelpersEmberSimpleAuth.invalidateSession)(application);
            visit('/settings/apps');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/signin');
            });
        });

        (0, _mocha.it)('redirects to team page when authenticated as author', function () {
            var role = server.create('role', { name: 'Author' });
            var user = server.create('user', { roles: [role], slug: 'test-user' });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            visit('/settings/apps');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/team/test-user');
            });
        });

        (0, _mocha.it)('redirects to team page when authenticated as editor', function () {
            var role = server.create('role', { name: 'Editor' });
            var user = server.create('user', { roles: [role], slug: 'test-user' });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            visit('/settings/apps');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/team');
            });
        });

        (0, _mocha.describe)('when logged in', function () {
            (0, _mocha.beforeEach)(function () {
                var role = server.create('role', { name: 'Administrator' });
                var user = server.create('user', { roles: [role] });

                server.loadFixtures();

                return (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            });

            (0, _mocha.it)('it redirects to Slack when clicking on the grid', function () {
                visit('/settings/apps');

                andThen(function () {
                    // has correct url
                    (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/settings/apps');
                });

                click('#slack-link');

                andThen(function () {
                    // has correct url
                    (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/settings/apps/slack');
                });
            });
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/acceptance/settings/code-injection-test', ['exports', 'mocha', 'chai', 'ghost-admin/tests/helpers/start-app', 'ghost-admin/tests/helpers/destroy-app', 'ghost-admin/tests/helpers/ember-simple-auth'], function (exports, _mocha, _chai, _ghostAdminTestsHelpersStartApp, _ghostAdminTestsHelpersDestroyApp, _ghostAdminTestsHelpersEmberSimpleAuth) {

    (0, _mocha.describe)('Acceptance: Settings - Code-Injection', function () {
        var application = undefined;

        (0, _mocha.beforeEach)(function () {
            application = (0, _ghostAdminTestsHelpersStartApp['default'])();
        });

        (0, _mocha.afterEach)(function () {
            (0, _ghostAdminTestsHelpersDestroyApp['default'])(application);
        });

        (0, _mocha.it)('redirects to signin when not authenticated', function () {
            (0, _ghostAdminTestsHelpersEmberSimpleAuth.invalidateSession)(application);
            visit('/settings/code-injection');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/signin');
            });
        });

        (0, _mocha.it)('redirects to team page when authenticated as author', function () {
            var role = server.create('role', { name: 'Author' });
            var user = server.create('user', { roles: [role], slug: 'test-user' });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            visit('/settings/code-injection');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/team/test-user');
            });
        });

        (0, _mocha.it)('redirects to team page when authenticated as editor', function () {
            var role = server.create('role', { name: 'Editor' });
            var user = server.create('user', { roles: [role], slug: 'test-user' });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            visit('/settings/code-injection');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/team');
            });
        });

        (0, _mocha.describe)('when logged in', function () {
            (0, _mocha.beforeEach)(function () {
                var role = server.create('role', { name: 'Administrator' });
                var user = server.create('user', { roles: [role] });

                server.loadFixtures();

                return (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            });

            (0, _mocha.it)('it renders, loads editors correctly', function () {
                visit('/settings/code-injection');

                andThen(function () {
                    // has correct url
                    (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/settings/code-injection');

                    // has correct page title
                    (0, _chai.expect)(document.title, 'page title').to.equal('Settings - Code Injection - Test Blog');

                    // highlights nav menu
                    (0, _chai.expect)($('.gh-nav-settings-code-injection').hasClass('active'), 'highlights nav menu item').to.be['true'];

                    (0, _chai.expect)(find('.view-header .view-actions .btn-blue').text().trim(), 'save button text').to.equal('Save');

                    (0, _chai.expect)(find('#ghost-head .CodeMirror').length, 'ghost head codemirror element').to.equal(1);
                    (0, _chai.expect)($('#ghost-head .CodeMirror').hasClass('cm-s-xq-light'), 'ghost head editor theme').to.be['true'];

                    (0, _chai.expect)(find('#ghost-foot .CodeMirror').length, 'ghost head codemirror element').to.equal(1);
                    (0, _chai.expect)($('#ghost-foot .CodeMirror').hasClass('cm-s-xq-light'), 'ghost head editor theme').to.be['true'];
                });
            });
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/acceptance/settings/general-test', ['exports', 'mocha', 'chai', 'ember', 'ghost-admin/tests/helpers/start-app', 'ghost-admin/tests/helpers/destroy-app', 'ghost-admin/tests/helpers/ember-simple-auth'], function (exports, _mocha, _chai, _ember, _ghostAdminTestsHelpersStartApp, _ghostAdminTestsHelpersDestroyApp, _ghostAdminTestsHelpersEmberSimpleAuth) {
    var run = _ember['default'].run;

    (0, _mocha.describe)('Acceptance: Settings - General', function () {
        var application = undefined;

        (0, _mocha.beforeEach)(function () {
            application = (0, _ghostAdminTestsHelpersStartApp['default'])();
        });

        (0, _mocha.afterEach)(function () {
            (0, _ghostAdminTestsHelpersDestroyApp['default'])(application);
        });

        (0, _mocha.it)('redirects to signin when not authenticated', function () {
            (0, _ghostAdminTestsHelpersEmberSimpleAuth.invalidateSession)(application);
            visit('/settings/general');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/signin');
            });
        });

        (0, _mocha.it)('redirects to team page when authenticated as author', function () {
            var role = server.create('role', { name: 'Author' });
            var user = server.create('user', { roles: [role], slug: 'test-user' });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            visit('/settings/general');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/team/test-user');
            });
        });

        (0, _mocha.it)('redirects to team page when authenticated as editor', function () {
            var role = server.create('role', { name: 'Editor' });
            var user = server.create('user', { roles: [role], slug: 'test-user' });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            visit('/settings/general');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/team');
            });
        });

        (0, _mocha.describe)('when logged in', function () {
            (0, _mocha.beforeEach)(function () {
                var role = server.create('role', { name: 'Administrator' });
                var user = server.create('user', { roles: [role] });

                server.loadFixtures();

                return (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            });

            (0, _mocha.it)('it renders, shows image uploader modals', function () {
                visit('/settings/general');

                andThen(function () {
                    // has correct url
                    (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/settings/general');

                    // has correct page title
                    (0, _chai.expect)(document.title, 'page title').to.equal('Settings - General - Test Blog');

                    // highlights nav menu
                    (0, _chai.expect)($('.gh-nav-settings-general').hasClass('active'), 'highlights nav menu item').to.be['true'];

                    (0, _chai.expect)(find('.view-header .view-actions .btn-blue').text().trim(), 'save button text').to.equal('Save');

                    // initial postsPerPage should be 5
                    (0, _chai.expect)(find('input#postsPerPage').val(), 'post per page value').to.equal('5');

                    (0, _chai.expect)(find('input#permalinks').prop('checked'), 'date permalinks checkbox').to.be['false'];
                });

                fillIn('#settings-general input[name="general[title]"]', 'New Blog Title');
                click('.view-header .btn.btn-blue');

                andThen(function () {
                    (0, _chai.expect)(document.title, 'page title').to.equal('Settings - General - New Blog Title');
                });

                click('.blog-logo');

                andThen(function () {
                    (0, _chai.expect)(find('.fullscreen-modal .modal-content .gh-image-uploader').length, 'modal selector').to.equal(1);
                });

                click('.fullscreen-modal .modal-content .gh-image-uploader .image-cancel');

                andThen(function () {
                    (0, _chai.expect)(find('.fullscreen-modal .modal-content .gh-image-uploader .description').text()).to.equal('Upload an image');
                });

                // click cancel button
                click('.fullscreen-modal .modal-footer .btn.btn-minor');

                andThen(function () {
                    (0, _chai.expect)(find('.fullscreen-modal').length).to.equal(0);
                });

                click('.blog-cover');

                andThen(function () {
                    (0, _chai.expect)(find('.fullscreen-modal .modal-content .gh-image-uploader').length, 'modal selector').to.equal(1);
                });

                click('.fullscreen-modal .modal-footer .js-button-accept');

                andThen(function () {
                    (0, _chai.expect)(find('.fullscreen-modal').length).to.equal(0);
                });

                // renders theme selector correctly
                andThen(function () {
                    (0, _chai.expect)(find('#activeTheme select option').length, 'available themes').to.equal(1);
                    (0, _chai.expect)(find('#activeTheme select option').text().trim()).to.equal('Blog - 1.0');
                });
            });

            (0, _mocha.it)('renders timezone selector correctly', function () {
                visit('/settings/general');

                andThen(function () {
                    (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/settings/general');

                    (0, _chai.expect)(find('#activeTimezone select option').length, 'available timezones').to.equal(65);
                    (0, _chai.expect)(find('#activeTimezone option:selected').text().trim()).to.equal('(GMT) Greenwich Mean Time : Dublin, Edinburgh, London');
                    find('#activeTimezone option[value="Africa/Cairo"]').prop('selected', true);
                });

                triggerEvent('#activeTimezone select', 'change');
                click('.view-header .btn.btn-blue');

                andThen(function () {
                    (0, _chai.expect)(find('#activeTimezone option:selected').text().trim()).to.equal('(GMT +2:00) Cairo, Egypt');
                });
            });

            (0, _mocha.it)('handles private blog settings correctly', function () {
                visit('/settings/general');

                // handles private blog settings correctly
                andThen(function () {
                    (0, _chai.expect)(find('input#isPrivate').prop('checked'), 'isPrivate checkbox').to.be['false'];
                });

                click('input#isPrivate');

                andThen(function () {
                    (0, _chai.expect)(find('input#isPrivate').prop('checked'), 'isPrivate checkbox').to.be['true'];
                    (0, _chai.expect)(find('#settings-general input[name="general[password]"]').length, 'password input').to.equal(1);
                    (0, _chai.expect)(find('#settings-general input[name="general[password]"]').val(), 'password default value').to.not.equal('');
                });

                fillIn('#settings-general input[name="general[password]"]', '');
                triggerEvent('#settings-general input[name="general[password]"]', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('#settings-general .error .response').text().trim(), 'inline validation response').to.equal('Password must be supplied');
                });

                fillIn('#settings-general input[name="general[password]"]', 'asdfg');
                triggerEvent('#settings-general input[name="general[password]"]', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('#settings-general .error .response').text().trim(), 'inline validation response').to.equal('');
                });

                // validates a facebook url correctly

                andThen(function () {
                    // loads fixtures and performs transform
                    (0, _chai.expect)(find('input[name="general[facebook]"]').val(), 'initial facebook value').to.equal('https://www.facebook.com/test');
                });

                triggerEvent('#settings-general input[name="general[facebook]"]', 'focus');
                triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

                andThen(function () {
                    // regression test: we still have a value after the input is
                    // focused and then blurred without any changes
                    (0, _chai.expect)(find('input[name="general[facebook]"]').val(), 'facebook value after blur with no change').to.equal('https://www.facebook.com/test');
                });

                fillIn('#settings-general input[name="general[facebook]"]', 'facebook.com/username');
                triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/username');
                    (0, _chai.expect)(find('#settings-general .error .response').text().trim(), 'inline validation response').to.equal('');
                });

                fillIn('#settings-general input[name="general[facebook]"]', 'facebook.com/pages/some-facebook-page/857469375913?ref=ts');
                triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/pages/some-facebook-page/857469375913?ref=ts');
                    (0, _chai.expect)(find('#settings-general .error .response').text().trim(), 'inline validation response').to.equal('');
                });

                fillIn('#settings-general input[name="general[facebook]"]', '*(&*(%%))');
                triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('#settings-general .error .response').text().trim(), 'inline validation response').to.equal('The URL must be in a format like https://www.facebook.com/yourPage');
                });

                fillIn('#settings-general input[name="general[facebook]"]', 'http://github.com/username');
                triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/username');
                    (0, _chai.expect)(find('#settings-general .error .response').text().trim(), 'inline validation response').to.equal('');
                });

                fillIn('#settings-general input[name="general[facebook]"]', 'http://github.com/pages/username');
                triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/pages/username');
                    (0, _chai.expect)(find('#settings-general .error .response').text().trim(), 'inline validation response').to.equal('');
                });

                fillIn('#settings-general input[name="general[facebook]"]', 'testuser');
                triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/testuser');
                    (0, _chai.expect)(find('#settings-general .error .response').text().trim(), 'inline validation response').to.equal('');
                });

                fillIn('#settings-general input[name="general[facebook]"]', 'ab99');
                triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('#settings-general .error .response').text().trim(), 'inline validation response').to.equal('Your Page name is not a valid Facebook Page name');
                });

                fillIn('#settings-general input[name="general[facebook]"]', 'page/ab99');
                triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/page/ab99');
                    (0, _chai.expect)(find('#settings-general .error .response').text().trim(), 'inline validation response').to.equal('');
                });

                fillIn('#settings-general input[name="general[facebook]"]', 'page/*(&*(%%))');
                triggerEvent('#settings-general input[name="general[facebook]"]', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('#settings-general input[name="general[facebook]"]').val()).to.be.equal('https://www.facebook.com/page/*(&*(%%))');
                    (0, _chai.expect)(find('#settings-general .error .response').text().trim(), 'inline validation response').to.equal('');
                });

                // validates a twitter url correctly

                andThen(function () {
                    // loads fixtures and performs transform
                    (0, _chai.expect)(find('input[name="general[twitter]"]').val(), 'initial twitter value').to.equal('https://twitter.com/test');
                });

                triggerEvent('#settings-general input[name="general[twitter]"]', 'focus');
                triggerEvent('#settings-general input[name="general[twitter]"]', 'blur');

                andThen(function () {
                    // regression test: we still have a value after the input is
                    // focused and then blurred without any changes
                    (0, _chai.expect)(find('input[name="general[twitter]"]').val(), 'twitter value after blur with no change').to.equal('https://twitter.com/test');
                });

                fillIn('#settings-general input[name="general[twitter]"]', 'twitter.com/username');
                triggerEvent('#settings-general input[name="general[twitter]"]', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('#settings-general input[name="general[twitter]"]').val()).to.be.equal('https://twitter.com/username');
                    (0, _chai.expect)(find('#settings-general .error .response').text().trim(), 'inline validation response').to.equal('');
                });

                fillIn('#settings-general input[name="general[twitter]"]', '*(&*(%%))');
                triggerEvent('#settings-general input[name="general[twitter]"]', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('#settings-general .error .response').text().trim(), 'inline validation response').to.equal('The URL must be in a format like https://twitter.com/yourUsername');
                });

                fillIn('#settings-general input[name="general[twitter]"]', 'http://github.com/username');
                triggerEvent('#settings-general input[name="general[twitter]"]', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('#settings-general input[name="general[twitter]"]').val()).to.be.equal('https://twitter.com/username');
                    (0, _chai.expect)(find('#settings-general .error .response').text().trim(), 'inline validation response').to.equal('');
                });

                fillIn('#settings-general input[name="general[twitter]"]', 'thisusernamehasmorethan15characters');
                triggerEvent('#settings-general input[name="general[twitter]"]', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('#settings-general .error .response').text().trim(), 'inline validation response').to.equal('Your Username is not a valid Twitter Username');
                });

                fillIn('#settings-general input[name="general[twitter]"]', 'testuser');
                triggerEvent('#settings-general input[name="general[twitter]"]', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('#settings-general input[name="general[twitter]"]').val()).to.be.equal('https://twitter.com/testuser');
                    (0, _chai.expect)(find('#settings-general .error .response').text().trim(), 'inline validation response').to.equal('');
                });
            });
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/acceptance/settings/labs-test', ['exports', 'mocha', 'chai', 'ghost-admin/tests/helpers/start-app', 'ghost-admin/tests/helpers/destroy-app', 'ghost-admin/tests/helpers/ember-simple-auth'], function (exports, _mocha, _chai, _ghostAdminTestsHelpersStartApp, _ghostAdminTestsHelpersDestroyApp, _ghostAdminTestsHelpersEmberSimpleAuth) {

    (0, _mocha.describe)('Acceptance: Settings - Labs', function () {
        var application = undefined;

        (0, _mocha.beforeEach)(function () {
            application = (0, _ghostAdminTestsHelpersStartApp['default'])();
        });

        (0, _mocha.afterEach)(function () {
            (0, _ghostAdminTestsHelpersDestroyApp['default'])(application);
        });

        (0, _mocha.it)('redirects to signin when not authenticated', function () {
            (0, _ghostAdminTestsHelpersEmberSimpleAuth.invalidateSession)(application);
            visit('/settings/labs');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/signin');
            });
        });

        (0, _mocha.it)('redirects to team page when authenticated as author', function () {
            var role = server.create('role', { name: 'Author' });
            var user = server.create('user', { roles: [role], slug: 'test-user' });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            visit('/settings/labs');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/team/test-user');
            });
        });

        (0, _mocha.it)('redirects to team page when authenticated as editor', function () {
            var role = server.create('role', { name: 'Editor' });
            var user = server.create('user', { roles: [role], slug: 'test-user' });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            visit('/settings/labs');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/team');
            });
        });

        (0, _mocha.describe)('when logged in', function () {
            (0, _mocha.beforeEach)(function () {
                var role = server.create('role', { name: 'Administrator' });
                var user = server.create('user', { roles: [role] });

                server.loadFixtures();

                return (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            });

            (0, _mocha.it)('it renders, loads modals correctly', function () {
                visit('/settings/labs');

                andThen(function () {
                    // has correct url
                    (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/settings/labs');

                    // has correct page title
                    (0, _chai.expect)(document.title, 'page title').to.equal('Settings - Labs - Test Blog');

                    // highlights nav menu
                    (0, _chai.expect)($('.gh-nav-settings-labs').hasClass('active'), 'highlights nav menu item').to.be['true'];
                });

                click('#settings-resetdb .js-delete');

                andThen(function () {
                    (0, _chai.expect)(find('.fullscreen-modal .modal-content').length, 'modal element').to.equal(1);
                });

                click('.fullscreen-modal .modal-footer .btn.btn-minor');

                andThen(function () {
                    (0, _chai.expect)(find('.fullscreen-modal').length, 'modal element').to.equal(0);
                });
            });
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/acceptance/settings/navigation-test', ['exports', 'mocha', 'chai', 'ghost-admin/tests/helpers/start-app', 'ghost-admin/tests/helpers/destroy-app', 'ghost-admin/tests/helpers/ember-simple-auth'], function (exports, _mocha, _chai, _ghostAdminTestsHelpersStartApp, _ghostAdminTestsHelpersDestroyApp, _ghostAdminTestsHelpersEmberSimpleAuth) {
    var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

    (0, _mocha.describe)('Acceptance: Settings - Navigation', function () {
        var application = undefined;

        (0, _mocha.beforeEach)(function () {
            application = (0, _ghostAdminTestsHelpersStartApp['default'])();
        });

        (0, _mocha.afterEach)(function () {
            (0, _ghostAdminTestsHelpersDestroyApp['default'])(application);
        });

        (0, _mocha.it)('redirects to signin when not authenticated', function () {
            (0, _ghostAdminTestsHelpersEmberSimpleAuth.invalidateSession)(application);
            visit('/settings/navigation');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/signin');
            });
        });

        (0, _mocha.it)('redirects to team page when authenticated as author', function () {
            var role = server.create('role', { name: 'Author' });
            var user = server.create('user', { roles: [role], slug: 'test-user' });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            visit('/settings/navigation');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/team/test-user');
            });
        });

        (0, _mocha.describe)('when logged in', function () {
            (0, _mocha.beforeEach)(function () {
                var role = server.create('role', { name: 'Administrator' });
                var user = server.create('user', { roles: [role] });

                // load the settings fixtures
                // TODO: this should always be run for acceptance tests
                server.loadFixtures();

                (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            });

            (0, _mocha.it)('can visit /settings/navigation', function () {
                visit('/settings/navigation');

                andThen(function () {
                    (0, _chai.expect)(currentPath()).to.equal('settings.navigation');

                    // fixtures contain two nav items, check for three rows as we
                    // should have one extra that's blank
                    (0, _chai.expect)(find('.gh-blognav-item').length, 'navigation items count').to.equal(3);
                });
            });

            (0, _mocha.it)('saves navigation settings', function () {
                visit('/settings/navigation');
                fillIn('.gh-blognav-label:first input', 'Test');
                fillIn('.gh-blognav-url:first input', '/test');
                triggerEvent('.gh-blognav-url:first input', 'blur');

                click('.btn-blue');

                andThen(function () {
                    var _server$db$settings$where = server.db.settings.where({ key: 'navigation' });

                    var _server$db$settings$where2 = _slicedToArray(_server$db$settings$where, 1);

                    var navSetting = _server$db$settings$where2[0];

                    (0, _chai.expect)(navSetting.value).to.equal('[{"label":"Test","url":"/test/"},{"label":"About","url":"/about"}]');

                    // don't test against .error directly as it will pick up failed
                    // tests "pre.error" elements
                    (0, _chai.expect)(find('span.error').length, 'error fields count').to.equal(0);
                    (0, _chai.expect)(find('.gh-alert').length, 'alerts count').to.equal(0);
                    (0, _chai.expect)(find('.response:visible').length, 'validation errors count').to.equal(0);
                });
            });

            (0, _mocha.it)('validates new item correctly on save', function () {
                visit('/settings/navigation');

                click('.btn-blue');

                andThen(function () {
                    (0, _chai.expect)(find('.gh-blognav-item').length, 'number of nav items after saving with blank new item').to.equal(3);
                });

                fillIn('.gh-blognav-label:last input', 'Test');
                fillIn('.gh-blognav-url:last input', 'http://invalid domain/');
                triggerEvent('.gh-blognav-url:last input', 'blur');

                click('.btn-blue');

                andThen(function () {
                    (0, _chai.expect)(find('.gh-blognav-item').length, 'number of nav items after saving with invalid new item').to.equal(3);

                    (0, _chai.expect)(find('.gh-blognav-item:last .error').length, 'number of invalid fields in new item').to.equal(1);
                });
            });

            (0, _mocha.it)('clears unsaved settings when navigating away', function () {
                visit('/settings/navigation');
                fillIn('.gh-blognav-label:first input', 'Test');
                triggerEvent('.gh-blognav-label:first input', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('.gh-blognav-label:first input').val()).to.equal('Test');
                });

                visit('/settings/code-injection');
                visit('/settings/navigation');

                andThen(function () {
                    (0, _chai.expect)(find('.gh-blognav-label:first input').val()).to.equal('Home');
                });
            });

            (0, _mocha.it)('can add and remove items', function (done) {
                visit('/settings/navigation');

                click('.gh-blognav-add');

                andThen(function () {
                    (0, _chai.expect)(find('.gh-blognav-label:last .response').is(':visible'), 'blank label has validation error').to.be['true'];
                });

                fillIn('.gh-blognav-label:last input', 'New');
                triggerEvent('.gh-blognav-label:last input', 'keypress', {});

                andThen(function () {
                    (0, _chai.expect)(find('.gh-blognav-label:last .response').is(':visible'), 'label validation is visible after typing').to.be['false'];
                });

                fillIn('.gh-blognav-url:last input', '/new');
                triggerEvent('.gh-blognav-url:last input', 'keypress', {});
                triggerEvent('.gh-blognav-url:last input', 'blur');

                andThen(function () {
                    (0, _chai.expect)(find('.gh-blognav-url:last .response').is(':visible'), 'url validation is visible after typing').to.be['false'];

                    (0, _chai.expect)(find('.gh-blognav-url:last input').val()).to.equal(window.location.protocol + '//' + window.location.host + '/new/');
                });

                click('.gh-blognav-add');

                andThen(function () {
                    (0, _chai.expect)(find('.gh-blognav-item').length, 'number of nav items after successful add').to.equal(4);

                    (0, _chai.expect)(find('.gh-blognav-label:last input').val(), 'new item label value after successful add').to.be.blank;

                    (0, _chai.expect)(find('.gh-blognav-url:last input').val(), 'new item url value after successful add').to.equal(window.location.protocol + '//' + window.location.host + '/');

                    (0, _chai.expect)(find('.gh-blognav-item .response:visible').length, 'number or validation errors shown after successful add').to.equal(0);
                });

                click('.gh-blognav-item:first .gh-blognav-delete');

                andThen(function () {
                    (0, _chai.expect)(find('.gh-blognav-item').length, 'number of nav items after successful remove').to.equal(3);
                });

                click('.btn-blue');

                andThen(function () {
                    var _server$db$settings$where3 = server.db.settings.where({ key: 'navigation' });

                    var _server$db$settings$where32 = _slicedToArray(_server$db$settings$where3, 1);

                    var navSetting = _server$db$settings$where32[0];

                    (0, _chai.expect)(navSetting.value).to.equal('[{"label":"About","url":"/about"},{"label":"New","url":"/new/"}]');

                    done();
                });
            });
        });
    });
});
/* jshint expr:true */
/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
define('ghost-admin/tests/acceptance/settings/slack-test', ['exports', 'mocha', 'chai', 'ember', 'ghost-admin/tests/helpers/start-app', 'ghost-admin/tests/helpers/destroy-app', 'ember-cli-mirage', 'ghost-admin/tests/helpers/ember-simple-auth'], function (exports, _mocha, _chai, _ember, _ghostAdminTestsHelpersStartApp, _ghostAdminTestsHelpersDestroyApp, _emberCliMirage, _ghostAdminTestsHelpersEmberSimpleAuth) {
    var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

    var run = _ember['default'].run;

    (0, _mocha.describe)('Acceptance: Settings - Apps - Slack', function () {
        var application = undefined;

        (0, _mocha.beforeEach)(function () {
            application = (0, _ghostAdminTestsHelpersStartApp['default'])();
        });

        (0, _mocha.afterEach)(function () {
            (0, _ghostAdminTestsHelpersDestroyApp['default'])(application);
        });

        (0, _mocha.it)('redirects to signin when not authenticated', function () {
            (0, _ghostAdminTestsHelpersEmberSimpleAuth.invalidateSession)(application);
            visit('/settings/apps/slack');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/signin');
            });
        });

        (0, _mocha.it)('redirects to team page when authenticated as author', function () {
            var role = server.create('role', { name: 'Author' });
            var user = server.create('user', { roles: [role], slug: 'test-user' });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            visit('/settings/apps/slack');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/team/test-user');
            });
        });

        (0, _mocha.it)('redirects to team page when authenticated as editor', function () {
            var role = server.create('role', { name: 'Editor' });
            var user = server.create('user', { roles: [role], slug: 'test-user' });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            visit('/settings/apps/slack');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/team');
            });
        });

        (0, _mocha.describe)('when logged in', function () {
            (0, _mocha.beforeEach)(function () {
                var role = server.create('role', { name: 'Administrator' });
                var user = server.create('user', { roles: [role] });

                server.loadFixtures();

                return (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            });

            (0, _mocha.it)('it validates and saves a slack url properly', function () {
                visit('/settings/apps/slack');

                andThen(function () {
                    // has correct url
                    (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/settings/apps/slack');
                });

                fillIn('#slack-settings input[name="slack[url]"]', 'notacorrecturl');
                click('#saveSlackIntegration');

                andThen(function () {
                    (0, _chai.expect)(find('#slack-settings .error .response').text().trim(), 'inline validation response').to.equal('The URL must be in a format like https://hooks.slack.com/services/<your personal key>');
                });

                fillIn('#slack-settings input[name="slack[url]"]', 'https://hooks.slack.com/services/1275958430');
                click('#sendTestNotification');

                andThen(function () {
                    (0, _chai.expect)(find('.gh-alert-blue').length, 'modal element').to.equal(1);
                    (0, _chai.expect)(find('#slack-settings .error .response').text().trim(), 'inline validation response').to.equal('');
                });

                andThen(function () {
                    server.put('/settings/', function (db, request) {
                        return new _emberCliMirage['default'].Response(402, {}, {
                            errors: [{
                                errorType: 'ValidationError',
                                message: 'Test error'
                            }]
                        });
                    });
                });

                click('.gh-alert-blue .gh-alert-close');
                click('#sendTestNotification');

                andThen(function () {
                    var _server$pretender$handledRequests$slice = server.pretender.handledRequests.slice(-1);

                    var _server$pretender$handledRequests$slice2 = _slicedToArray(_server$pretender$handledRequests$slice, 1);

                    var lastRequest = _server$pretender$handledRequests$slice2[0];

                    (0, _chai.expect)(lastRequest.url).to.not.match(/\/slack\/test/);
                    (0, _chai.expect)(find('.gh-alert-blue').length, 'check slack alert after api validation error').to.equal(0);
                });
            });
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/acceptance/settings/tags-test', ['exports', 'mocha', 'chai', 'ember', 'ghost-admin/tests/helpers/start-app', 'ghost-admin/tests/helpers/destroy-app', 'ghost-admin/tests/helpers/ember-simple-auth', 'ghost-admin/tests/helpers/adapter-error', 'ember-cli-mirage'], function (exports, _mocha, _chai, _ember, _ghostAdminTestsHelpersStartApp, _ghostAdminTestsHelpersDestroyApp, _ghostAdminTestsHelpersEmberSimpleAuth, _ghostAdminTestsHelpersAdapterError, _emberCliMirage) {
    var run = _ember['default'].run;

    // Grabbed from keymaster's testing code because Ember's `keyEvent` helper
    // is for some reason not triggering the events in a way that keymaster detects:
    // https://github.com/madrobby/keymaster/blob/master/test/keymaster.html#L31
    var modifierMap = {
        16: 'shiftKey',
        18: 'altKey',
        17: 'ctrlKey',
        91: 'metaKey'
    };
    var keydown = function keydown(code, modifiers, el) {
        var event = document.createEvent('Event');
        event.initEvent('keydown', true, true);
        event.keyCode = code;
        if (modifiers && modifiers.length > 0) {
            for (var i in modifiers) {
                event[modifierMap[modifiers[i]]] = true;
            }
        }
        (el || document).dispatchEvent(event);
    };
    var keyup = function keyup(code, el) {
        var event = document.createEvent('Event');
        event.initEvent('keyup', true, true);
        event.keyCode = code;
        (el || document).dispatchEvent(event);
    };

    (0, _mocha.describe)('Acceptance: Settings - Tags', function () {
        var application = undefined;

        (0, _mocha.beforeEach)(function () {
            application = (0, _ghostAdminTestsHelpersStartApp['default'])();
        });

        (0, _mocha.afterEach)(function () {
            (0, _ghostAdminTestsHelpersDestroyApp['default'])(application);
        });

        (0, _mocha.it)('redirects to signin when not authenticated', function () {
            (0, _ghostAdminTestsHelpersEmberSimpleAuth.invalidateSession)(application);
            visit('/settings/tags');

            andThen(function () {
                (0, _chai.expect)(currentURL()).to.equal('/signin');
            });
        });

        (0, _mocha.it)('redirects to team page when authenticated as author', function () {
            var role = server.create('role', { name: 'Author' });
            var user = server.create('user', { roles: [role], slug: 'test-user' });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            visit('/settings/navigation');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/team/test-user');
            });
        });

        (0, _mocha.describe)('when logged in', function () {
            (0, _mocha.beforeEach)(function () {
                var role = server.create('role', { name: 'Administrator' });
                var user = server.create('user', { roles: [role] });

                // load the settings fixtures
                // TODO: this should always be run for acceptance tests
                server.loadFixtures();

                return (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            });

            (0, _mocha.it)('it renders, can be navigated, can edit, create & delete tags', function () {
                var tag1 = server.create('tag');
                var tag2 = server.create('tag');

                visit('/settings/tags');

                andThen(function () {
                    // it redirects to first tag
                    (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/settings/tags/' + tag1.slug);

                    // it has correct page title
                    (0, _chai.expect)(document.title, 'page title').to.equal('Settings - Tags - Test Blog');

                    // it highlights nav menu
                    (0, _chai.expect)($('.gh-nav-settings-tags').hasClass('active'), 'highlights nav menu item').to.be['true'];

                    // it lists all tags
                    (0, _chai.expect)(find('.settings-tags .settings-tag').length, 'tag list count').to.equal(2);
                    (0, _chai.expect)(find('.settings-tags .settings-tag:first .tag-title').text(), 'tag list item title').to.equal(tag1.name);

                    // it highlights selected tag
                    (0, _chai.expect)(find('a[href="/settings/tags/' + tag1.slug + '"]').hasClass('active'), 'highlights selected tag').to.be['true'];

                    // it shows selected tag form
                    (0, _chai.expect)(find('.tag-settings-pane h4').text(), 'settings pane title').to.equal('Tag Settings');
                    (0, _chai.expect)(find('.tag-settings-pane input[name="name"]').val(), 'loads correct tag into form').to.equal(tag1.name);
                });

                // click the second tag in the list
                click('.tag-edit-button:last');

                andThen(function () {
                    // it navigates to selected tag
                    (0, _chai.expect)(currentURL(), 'url after clicking tag').to.equal('/settings/tags/' + tag2.slug);

                    // it highlights selected tag
                    (0, _chai.expect)(find('a[href="/settings/tags/' + tag2.slug + '"]').hasClass('active'), 'highlights selected tag').to.be['true'];

                    // it shows selected tag form
                    (0, _chai.expect)(find('.tag-settings-pane input[name="name"]').val(), 'loads correct tag into form').to.equal(tag2.name);
                });

                andThen(function () {
                    // simulate up arrow press
                    run(function () {
                        keydown(38);
                        keyup(38);
                    });
                });

                andThen(function () {
                    // it navigates to previous tag
                    (0, _chai.expect)(currentURL(), 'url after keyboard up arrow').to.equal('/settings/tags/' + tag1.slug);

                    // it highlights selected tag
                    (0, _chai.expect)(find('a[href="/settings/tags/' + tag1.slug + '"]').hasClass('active'), 'selects previous tag').to.be['true'];
                });

                andThen(function () {
                    // simulate down arrow press
                    run(function () {
                        keydown(40);
                        keyup(40);
                    });
                });

                andThen(function () {
                    // it navigates to previous tag
                    (0, _chai.expect)(currentURL(), 'url after keyboard down arrow').to.equal('/settings/tags/' + tag2.slug);

                    // it highlights selected tag
                    (0, _chai.expect)(find('a[href="/settings/tags/' + tag2.slug + '"]').hasClass('active'), 'selects next tag').to.be['true'];
                });

                // trigger save
                fillIn('.tag-settings-pane input[name="name"]', 'New Name');
                triggerEvent('.tag-settings-pane input[name="name"]', 'blur');
                andThen(function () {
                    // check we update with the data returned from the server
                    (0, _chai.expect)(find('.settings-tags .settings-tag:last .tag-title').text(), 'tag list updates on save').to.equal('New Name');
                    (0, _chai.expect)(find('.tag-settings-pane input[name="name"]').val(), 'settings form updates on save').to.equal('New Name');
                });

                // start new tag
                click('.view-actions .btn-green');

                andThen(function () {
                    // it navigates to the new tag route
                    (0, _chai.expect)(currentURL(), 'new tag URL').to.equal('/settings/tags/new');

                    // it displays the new tag form
                    (0, _chai.expect)(find('.tag-settings-pane h4').text(), 'settings pane title').to.equal('New Tag');

                    // all fields start blank
                    find('.tag-settings-pane input, .tag-settings-pane textarea').each(function () {
                        (0, _chai.expect)($(this).val(), 'input field for ' + $(this).attr('name')).to.be.blank;
                    });
                });

                // save new tag
                fillIn('.tag-settings-pane input[name="name"]', 'New Tag');
                triggerEvent('.tag-settings-pane input[name="name"]', 'blur');

                andThen(function () {
                    // it redirects to the new tag's URL
                    (0, _chai.expect)(currentURL(), 'URL after tag creation').to.equal('/settings/tags/new-tag');

                    // it adds the tag to the list and selects
                    (0, _chai.expect)(find('.settings-tags .settings-tag').length, 'tag list count after creation').to.equal(3);
                    (0, _chai.expect)(find('.settings-tags .settings-tag:last .tag-title').text(), 'new tag list item title').to.equal('New Tag');
                    (0, _chai.expect)(find('a[href="/settings/tags/new-tag"]').hasClass('active'), 'highlights new tag').to.be['true'];
                });

                // delete tag
                click('.tag-delete-button');
                click('.fullscreen-modal .btn-red');

                andThen(function () {
                    // it redirects to the first tag
                    (0, _chai.expect)(currentURL(), 'URL after tag deletion').to.equal('/settings/tags/' + tag1.slug);

                    // it removes the tag from the list
                    (0, _chai.expect)(find('.settings-tags .settings-tag').length, 'tag list count after deletion').to.equal(2);
                });
            });

            (0, _mocha.it)('loads tag via slug when accessed directly', function () {
                server.createList('tag', 2);

                visit('/settings/tags/tag-1');

                andThen(function () {
                    (0, _chai.expect)(currentURL(), 'URL after direct load').to.equal('/settings/tags/tag-1');

                    // it loads all other tags
                    (0, _chai.expect)(find('.settings-tags .settings-tag').length, 'tag list count after direct load').to.equal(2);

                    // selects tag in list
                    (0, _chai.expect)(find('a[href="/settings/tags/tag-1"]').hasClass('active'), 'highlights requested tag').to.be['true'];

                    // shows requested tag in settings pane
                    (0, _chai.expect)(find('.tag-settings-pane input[name="name"]').val(), 'loads correct tag into form').to.equal('Tag 1');
                });
            });

            (0, _mocha.it)('has infinite scroll pagination of tags list', function () {
                server.createList('tag', 32);

                visit('settings/tags/tag-0');

                andThen(function () {
                    // it loads first page
                    (0, _chai.expect)(find('.settings-tags .settings-tag').length, 'tag list count on first load').to.equal(15);

                    find('.tag-list').scrollTop(find('.tag-list-content').height());
                });

                triggerEvent('.tag-list', 'scroll');

                andThen(function () {
                    // it loads the second page
                    (0, _chai.expect)(find('.settings-tags .settings-tag').length, 'tag list count on second load').to.equal(30);

                    find('.tag-list').scrollTop(find('.tag-list-content').height());
                });

                triggerEvent('.tag-list', 'scroll');

                andThen(function () {
                    // it loads the final page
                    (0, _chai.expect)(find('.settings-tags .settings-tag').length, 'tag list count on third load').to.equal(32);
                });
            });

            (0, _mocha.it)('redirects to 404 when tag does not exist', function () {
                server.get('/tags/slug/unknown/', function () {
                    return new _emberCliMirage['default'].Response(404, { 'Content-Type': 'application/json' }, { errors: [{ message: 'Tag not found.', errorType: 'NotFoundError' }] });
                });

                (0, _ghostAdminTestsHelpersAdapterError.errorOverride)();

                visit('settings/tags/unknown');

                andThen(function () {
                    (0, _ghostAdminTestsHelpersAdapterError.errorReset)();
                    (0, _chai.expect)(currentPath()).to.equal('error404');
                    (0, _chai.expect)(currentURL()).to.equal('/settings/tags/unknown');
                });
            });
        });
    });
});
/* jshint expr:true */
/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
define('ghost-admin/tests/acceptance/setup-test', ['exports', 'mocha', 'chai', 'ember', 'ghost-admin/tests/helpers/start-app', 'ghost-admin/tests/helpers/destroy-app', 'ghost-admin/tests/helpers/ember-simple-auth', 'ember-cli-mirage'], function (exports, _mocha, _chai, _ember, _ghostAdminTestsHelpersStartApp, _ghostAdminTestsHelpersDestroyApp, _ghostAdminTestsHelpersEmberSimpleAuth, _emberCliMirage) {
    var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

    (0, _mocha.describe)('Acceptance: Setup', function () {
        var application = undefined;

        (0, _mocha.beforeEach)(function () {
            application = (0, _ghostAdminTestsHelpersStartApp['default'])();
        });

        (0, _mocha.afterEach)(function () {
            (0, _ghostAdminTestsHelpersDestroyApp['default'])(application);
        });

        (0, _mocha.it)('redirects if already authenticated', function () {
            var role = server.create('role', { name: 'Author' });
            var user = server.create('user', { roles: [role], slug: 'test-user' });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);

            visit('/setup/one');
            andThen(function () {
                (0, _chai.expect)(currentURL()).to.equal('/');
            });

            visit('/setup/two');
            andThen(function () {
                (0, _chai.expect)(currentURL()).to.equal('/');
            });

            visit('/setup/three');
            andThen(function () {
                (0, _chai.expect)(currentURL()).to.equal('/');
            });
        });

        (0, _mocha.it)('redirects to signin if already set up', function () {
            // mimick an already setup blog
            server.get('/authentication/setup/', function () {
                return {
                    setup: [{ status: true }]
                };
            });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.invalidateSession)(application);

            visit('/setup');
            andThen(function () {
                (0, _chai.expect)(currentURL()).to.equal('/signin');
            });
        });

        (0, _mocha.describe)('with a new blog', function () {
            (0, _mocha.beforeEach)(function () {
                // mimick a new blog
                server.get('/authentication/setup/', function () {
                    return {
                        setup: [{ status: false }]
                    };
                });
            });

            (0, _mocha.it)('has a successful happy path', function () {
                (0, _ghostAdminTestsHelpersEmberSimpleAuth.invalidateSession)(application);
                server.loadFixtures('roles');

                visit('/setup');

                andThen(function () {
                    // it redirects to step one
                    (0, _chai.expect)(currentURL(), 'url after accessing /setup').to.equal('/setup/one');

                    // it highlights first step
                    (0, _chai.expect)(find('.gh-flow-nav .step:first-of-type').hasClass('active')).to.be['true'];
                    (0, _chai.expect)(find('.gh-flow-nav .step:nth-of-type(2)').hasClass('active')).to.be['false'];
                    (0, _chai.expect)(find('.gh-flow-nav .step:nth-of-type(3)').hasClass('active')).to.be['false'];

                    // it displays download count (count increments for each ajax call
                    // and polling is disabled in testing so our count should be "2" -
                    // 1 for first load and 1 for first poll)
                    (0, _chai.expect)(find('.gh-flow-content em').text()).to.equal('2');
                });

                click('.btn-green');

                andThen(function () {
                    // it transitions to step two
                    (0, _chai.expect)(currentURL(), 'url after clicking "Create your account"').to.equal('/setup/two');

                    // email field is focused by default
                    // NOTE: $('x').is(':focus') doesn't work in phantomjs CLI runner
                    // https://github.com/ariya/phantomjs/issues/10427
                    (0, _chai.expect)(find('[name="email"]').get(0) === document.activeElement, 'email field has focus').to.be['true'];
                });

                click('.btn-green');

                andThen(function () {
                    // it marks fields as invalid
                    (0, _chai.expect)(find('.form-group.error').length, 'number of invalid fields').to.equal(4);

                    // it displays error messages
                    (0, _chai.expect)(find('.error .response').length, 'number of in-line validation messages').to.equal(4);

                    // it displays main error
                    (0, _chai.expect)(find('.main-error').length, 'main error is displayed').to.equal(1);
                });

                // enter valid details and submit
                fillIn('[name="email"]', 'test@example.com');
                fillIn('[name="name"]', 'Test User');
                fillIn('[name="password"]', 'password');
                fillIn('[name="blog-title"]', 'Blog Title');
                click('.btn-green');

                andThen(function () {
                    // it transitions to step 3
                    (0, _chai.expect)(currentURL(), 'url after submitting step two').to.equal('/setup/three');

                    // submit button is "disabled"
                    (0, _chai.expect)(find('button[type="submit"]').hasClass('btn-green'), 'invite button with no emails is white').to.be['false'];
                });

                // fill in a valid email
                fillIn('[name="users"]', 'new-user@example.com');

                andThen(function () {
                    // submit button is "enabled"
                    (0, _chai.expect)(find('button[type="submit"]').hasClass('btn-green'), 'invite button is green with valid email address').to.be['true'];
                });

                // submit the invite form
                click('button[type="submit"]');

                andThen(function () {
                    // it redirects to the home / "content" screen
                    (0, _chai.expect)(currentURL(), 'url after submitting invites').to.equal('/');

                    // it displays success alert
                    (0, _chai.expect)(find('.gh-alert-green').length, 'number of success alerts').to.equal(1);
                });
            });

            (0, _mocha.it)('handles validation errors in step 2', function () {
                var postCount = 0;

                (0, _ghostAdminTestsHelpersEmberSimpleAuth.invalidateSession)(application);
                server.loadFixtures('roles');

                server.post('/authentication/setup', function () {
                    postCount++;

                    // validation error
                    if (postCount === 1) {
                        return new _emberCliMirage['default'].Response(422, {}, {
                            errors: [{
                                errorType: 'ValidationError',
                                message: 'Server response message'
                            }]
                        });
                    }

                    // server error
                    if (postCount === 2) {
                        return new _emberCliMirage['default'].Response(500, {}, null);
                    }
                });

                visit('/setup/two');
                click('.btn-green');

                andThen(function () {
                    // non-server validation
                    (0, _chai.expect)(find('.main-error').text().trim(), 'error text').to.not.be.blank;
                });

                fillIn('[name="email"]', 'test@example.com');
                fillIn('[name="name"]', 'Test User');
                fillIn('[name="password"]', 'password');
                fillIn('[name="blog-title"]', 'Blog Title');

                // first post - simulated validation error
                click('.btn-green');

                andThen(function () {
                    (0, _chai.expect)(find('.main-error').text().trim(), 'error text').to.equal('Server response message');
                });

                // second post - simulated server error
                click('.btn-green');

                andThen(function () {
                    (0, _chai.expect)(find('.main-error').text().trim(), 'error text').to.be.blank;

                    (0, _chai.expect)(find('.gh-alert-red').length, 'number of alerts').to.equal(1);
                });
            });

            (0, _mocha.it)('handles invalid origin error on step 2', function () {
                // mimick the API response for an invalid origin
                server.post('/authentication/token', function () {
                    return new _emberCliMirage['default'].Response(401, {}, {
                        errors: [{
                            errorType: 'UnauthorizedError',
                            message: 'Access Denied from url: unknown.com. Please use the url configured in config.js.'
                        }]
                    });
                });

                (0, _ghostAdminTestsHelpersEmberSimpleAuth.invalidateSession)(application);
                server.loadFixtures('roles');

                visit('/setup/two');
                fillIn('[name="email"]', 'test@example.com');
                fillIn('[name="name"]', 'Test User');
                fillIn('[name="password"]', 'password');
                fillIn('[name="blog-title"]', 'Blog Title');
                click('.btn-green');

                andThen(function () {
                    // button should not be spinning
                    (0, _chai.expect)(find('.btn-green .spinner').length, 'button has spinner').to.equal(0);
                    // we should show an error message
                    (0, _chai.expect)(find('.main-error').text(), 'error text').to.equal('Access Denied from url: unknown.com. Please use the url configured in config.js.');
                });
            });

            (0, _mocha.it)('handles validation errors in step 3', function () {
                var input = '[name="users"]';
                var postCount = 0;
                var button = undefined,
                    formGroup = undefined,
                    user = undefined;

                (0, _ghostAdminTestsHelpersEmberSimpleAuth.invalidateSession)(application);
                server.loadFixtures('roles');

                server.post('/users', function (db, request) {
                    var _JSON$parse$users = _slicedToArray(JSON.parse(request.requestBody).users, 1);

                    var params = _JSON$parse$users[0];

                    postCount++;

                    // invalid
                    if (postCount === 1) {
                        return new _emberCliMirage['default'].Response(422, {}, {
                            errors: [{
                                errorType: 'ValidationError',
                                message: 'Dummy validation error'
                            }]
                        });
                    }

                    // valid
                    user = db.users.insert(params);
                    return {
                        users: [user]
                    };
                });

                // complete step 2 so we can access step 3
                visit('/setup/two');
                fillIn('[name="email"]', 'test@example.com');
                fillIn('[name="name"]', 'Test User');
                fillIn('[name="password"]', 'password');
                fillIn('[name="blog-title"]', 'Blog Title');
                click('.btn-green');

                // default field/button state
                andThen(function () {
                    formGroup = find('.gh-flow-invite .form-group');
                    button = find('.gh-flow-invite button[type="submit"]');

                    (0, _chai.expect)(formGroup.hasClass('error'), 'default field has error class').to.be['false'];

                    (0, _chai.expect)(button.text().trim(), 'default button text').to.equal('Invite some users');

                    (0, _chai.expect)(button.hasClass('btn-minor'), 'default button is disabled').to.be['true'];
                });

                // no users submitted state
                click('.gh-flow-invite button[type="submit"]');

                andThen(function () {
                    (0, _chai.expect)(formGroup.hasClass('error'), 'no users submitted field has error class').to.be['true'];

                    (0, _chai.expect)(button.text().trim(), 'no users submitted button text').to.equal('No users to invite');

                    (0, _chai.expect)(button.hasClass('btn-minor'), 'no users submitted button is disabled').to.be['true'];
                });

                // single invalid email
                fillIn(input, 'invalid email');
                triggerEvent(input, 'blur');

                andThen(function () {
                    (0, _chai.expect)(formGroup.hasClass('error'), 'invalid field has error class').to.be['true'];

                    (0, _chai.expect)(button.text().trim(), 'single invalid button text').to.equal('1 invalid email address');

                    (0, _chai.expect)(button.hasClass('btn-minor'), 'invalid email button is disabled').to.be['true'];
                });

                // multiple invalid emails
                fillIn(input, 'invalid email\nanother invalid address');
                triggerEvent(input, 'blur');

                andThen(function () {
                    (0, _chai.expect)(button.text().trim(), 'multiple invalid button text').to.equal('2 invalid email addresses');
                });

                // single valid email
                fillIn(input, 'invited@example.com');
                triggerEvent(input, 'blur');

                andThen(function () {
                    (0, _chai.expect)(formGroup.hasClass('error'), 'valid field has error class').to.be['false'];

                    (0, _chai.expect)(button.text().trim(), 'single valid button text').to.equal('Invite 1 user');

                    (0, _chai.expect)(button.hasClass('btn-green'), 'valid email button is enabled').to.be['true'];
                });

                // multiple valid emails
                fillIn(input, 'invited1@example.com\ninvited2@example.com');
                triggerEvent(input, 'blur');

                andThen(function () {
                    (0, _chai.expect)(button.text().trim(), 'multiple valid button text').to.equal('Invite 2 users');
                });

                // submit invitations with simulated failure on 1 invite
                click('.btn-green');

                andThen(function () {
                    // it redirects to the home / "content" screen
                    (0, _chai.expect)(currentURL(), 'url after submitting invites').to.equal('/');

                    // it displays success alert
                    (0, _chai.expect)(find('.gh-alert-green').length, 'number of success alerts').to.equal(1);

                    // it displays failure alert
                    (0, _chai.expect)(find('.gh-alert-red').length, 'number of failure alerts').to.equal(1);
                });
            });
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/acceptance/signin-test', ['exports', 'mocha', 'chai', 'ghost-admin/tests/helpers/start-app', 'ghost-admin/tests/helpers/destroy-app', 'ghost-admin/tests/helpers/ember-simple-auth', 'ember-cli-mirage'], function (exports, _mocha, _chai, _ghostAdminTestsHelpersStartApp, _ghostAdminTestsHelpersDestroyApp, _ghostAdminTestsHelpersEmberSimpleAuth, _emberCliMirage) {

    (0, _mocha.describe)('Acceptance: Signin', function () {
        var application = undefined;

        (0, _mocha.beforeEach)(function () {
            application = (0, _ghostAdminTestsHelpersStartApp['default'])();
        });

        (0, _mocha.afterEach)(function () {
            (0, _ghostAdminTestsHelpersDestroyApp['default'])(application);
        });

        (0, _mocha.it)('redirects if already authenticated', function () {
            var role = server.create('role', { name: 'Author' });
            var user = server.create('user', { roles: [role], slug: 'test-user' });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);

            visit('/signin');
            andThen(function () {
                (0, _chai.expect)(currentURL(), 'current url').to.equal('/');
            });
        });

        (0, _mocha.describe)('when attempting to signin', function () {
            (0, _mocha.beforeEach)(function () {
                var role = server.create('role', { name: 'Administrator' });
                var user = server.create('user', { roles: [role], slug: 'test-user' });

                server.post('/authentication/token', function (db, request) {
                    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers

                    var _$$deparam = $.deparam(request.requestBody);

                    var grantType = _$$deparam.grant_type;
                    var username = _$$deparam.username;
                    var password = _$$deparam.password;
                    var clientId = _$$deparam.client_id;

                    (0, _chai.expect)(grantType, 'grant type').to.equal('password');
                    (0, _chai.expect)(username, 'username').to.equal('test@example.com');
                    (0, _chai.expect)(clientId, 'client id').to.equal('ghost-admin');

                    if (password === 'testpass') {
                        return {
                            access_token: '5JhTdKI7PpoZv4ROsFoERc6wCHALKFH5jxozwOOAErmUzWrFNARuH1q01TYTKeZkPW7FmV5MJ2fU00pg9sm4jtH3Z1LjCf8D6nNqLYCfFb2YEKyuvG7zHj4jZqSYVodN2YTCkcHv6k8oJ54QXzNTLIDMlCevkOebm5OjxGiJpafMxncm043q9u1QhdU9eee3zouGRMVVp8zkKVoo5zlGMi3zvS2XDpx7xsfk8hKHpUgd7EDDQxmMueifWv7hv6n',
                            expires_in: 3600,
                            refresh_token: 'XP13eDjwV5mxOcrq1jkIY9idhdvN3R1Br5vxYpYIub2P5Hdc8pdWMOGmwFyoUshiEB62JWHTl8H1kACJR18Z8aMXbnk5orG28br2kmVgtVZKqOSoiiWrQoeKTqrRV0t7ua8uY5HdDUaKpnYKyOdpagsSPn3WEj8op4vHctGL3svOWOjZhq6F2XeVPMR7YsbiwBE8fjT3VhTB3KRlBtWZd1rE0Qo2EtSplWyjGKv1liAEiL0ndQoLeeSOCH4rTP7',
                            token_type: 'Bearer'
                        };
                    } else {
                        return new _emberCliMirage['default'].Response(401, {}, {
                            errors: [{
                                errorType: 'UnauthorizedError',
                                message: 'Invalid Password'
                            }]
                        });
                    }
                    // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
                });
            });

            (0, _mocha.it)('errors correctly', function () {
                (0, _ghostAdminTestsHelpersEmberSimpleAuth.invalidateSession)(application);

                visit('/signin');

                andThen(function () {
                    (0, _chai.expect)(currentURL(), 'signin url').to.equal('/signin');

                    (0, _chai.expect)(find('input[name="identification"]').length, 'email input field').to.equal(1);
                    (0, _chai.expect)(find('input[name="password"]').length, 'password input field').to.equal(1);
                });

                click('.btn-blue');

                andThen(function () {
                    (0, _chai.expect)(find('.form-group.error').length, 'number of invalid fields').to.equal(2);

                    (0, _chai.expect)(find('.main-error').length, 'main error is displayed').to.equal(1);
                });

                fillIn('[name="identification"]', 'test@example.com');
                fillIn('[name="password"]', 'invalid');
                click('.btn-blue');

                andThen(function () {
                    (0, _chai.expect)(currentURL(), 'current url').to.equal('/signin');

                    (0, _chai.expect)(find('.main-error').length, 'main error is displayed').to.equal(1);

                    (0, _chai.expect)(find('.main-error').text().trim(), 'main error text').to.equal('Invalid Password');
                });
            });

            (0, _mocha.it)('submits successfully', function () {
                (0, _ghostAdminTestsHelpersEmberSimpleAuth.invalidateSession)(application);

                visit('/signin');

                andThen(function () {
                    (0, _chai.expect)(currentURL(), 'current url').to.equal('/signin');
                });

                fillIn('[name="identification"]', 'test@example.com');
                fillIn('[name="password"]', 'testpass');
                click('.btn-blue');

                andThen(function () {
                    (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/');
                });
            });
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/acceptance/subscribers-test', ['exports', 'mocha', 'chai', 'ghost-admin/tests/helpers/start-app', 'ghost-admin/tests/helpers/destroy-app', 'ghost-admin/tests/helpers/ember-simple-auth'], function (exports, _mocha, _chai, _ghostAdminTestsHelpersStartApp, _ghostAdminTestsHelpersDestroyApp, _ghostAdminTestsHelpersEmberSimpleAuth) {
    var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

    (0, _mocha.describe)('Acceptance: Subscribers', function () {
        var application = undefined;

        (0, _mocha.beforeEach)(function () {
            application = (0, _ghostAdminTestsHelpersStartApp['default'])();
        });

        (0, _mocha.afterEach)(function () {
            (0, _ghostAdminTestsHelpersDestroyApp['default'])(application);
        });

        (0, _mocha.it)('redirects to signin when not authenticated', function () {
            (0, _ghostAdminTestsHelpersEmberSimpleAuth.invalidateSession)(application);
            visit('/subscribers');

            andThen(function () {
                (0, _chai.expect)(currentURL()).to.equal('/signin');
            });
        });

        (0, _mocha.it)('redirects editors to posts', function () {
            var role = server.create('role', { name: 'Editor' });
            var user = server.create('user', { roles: [role] });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            visit('/subscribers');

            andThen(function () {
                (0, _chai.expect)(currentURL()).to.equal('/');
                (0, _chai.expect)(find('.gh-nav-main a:contains("Subscribers")').length, 'sidebar link is visible').to.equal(0);
            });
        });

        (0, _mocha.it)('redirects authors to posts', function () {
            var role = server.create('role', { name: 'Author' });
            var user = server.create('user', { roles: [role] });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            visit('/subscribers');

            andThen(function () {
                (0, _chai.expect)(currentURL()).to.equal('/');
                (0, _chai.expect)(find('.gh-nav-main a:contains("Subscribers")').length, 'sidebar link is visible').to.equal(0);
            });
        });

        (0, _mocha.describe)('an admin', function () {
            (0, _mocha.beforeEach)(function () {
                var role = server.create('role', { name: 'Administrator' });
                var user = server.create('user', { roles: [role] });

                server.loadFixtures();

                return (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            });

            (0, _mocha.it)('can manage subscribers', function () {
                server.createList('subscriber', 40);

                (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
                visit('/');
                click('.gh-nav-main a:contains("Subscribers")');

                andThen(function () {
                    // it navigates to the correct page
                    (0, _chai.expect)(currentPath()).to.equal('subscribers.index');

                    // it has correct page title
                    (0, _chai.expect)(document.title, 'page title').to.equal('Subscribers - Test Blog');

                    // it loads the first page
                    (0, _chai.expect)(find('.subscribers-table .lt-body .lt-row').length, 'number of subscriber rows').to.equal(30);

                    // it shows the total number of subscribers
                    (0, _chai.expect)(find('#total-subscribers').text().trim(), 'displayed subscribers total').to.equal('40');

                    // it defaults to sorting by created_at desc

                    var _server$pretender$handledRequests$slice = server.pretender.handledRequests.slice(-1);

                    var _server$pretender$handledRequests$slice2 = _slicedToArray(_server$pretender$handledRequests$slice, 1);

                    var lastRequest = _server$pretender$handledRequests$slice2[0];

                    (0, _chai.expect)(lastRequest.queryParams.order).to.equal('created_at desc');

                    var createdAtHeader = find('.subscribers-table th:contains("Subscription Date")');
                    (0, _chai.expect)(createdAtHeader.hasClass('is-sorted'), 'createdAt column is sorted').to.be['true'];
                    (0, _chai.expect)(createdAtHeader.find('.icon-descending').length, 'createdAt column has descending icon').to.equal(1);
                });

                // click the column to re-order
                click('th:contains("Subscription Date")');

                andThen(function () {
                    // it flips the directions and re-fetches

                    var _server$pretender$handledRequests$slice3 = server.pretender.handledRequests.slice(-1);

                    var _server$pretender$handledRequests$slice32 = _slicedToArray(_server$pretender$handledRequests$slice3, 1);

                    var lastRequest = _server$pretender$handledRequests$slice32[0];

                    (0, _chai.expect)(lastRequest.queryParams.order).to.equal('created_at asc');

                    var createdAtHeader = find('.subscribers-table th:contains("Subscription Date")');
                    (0, _chai.expect)(createdAtHeader.find('.icon-ascending').length, 'createdAt column has ascending icon').to.equal(1);

                    // scroll to the bottom of the table to simulate infinite scroll
                    find('.subscribers-table').scrollTop(find('.subscribers-table .ember-light-table').height());
                });

                // trigger infinite scroll
                triggerEvent('.subscribers-table', 'scroll');

                andThen(function () {
                    // it loads the next page
                    (0, _chai.expect)(find('.subscribers-table .lt-body .lt-row').length, 'number of subscriber rows after infinite-scroll').to.equal(40);
                });

                // click the add subscriber button
                click('.btn:contains("Add Subscriber")');

                andThen(function () {
                    // it displays the add subscriber modal
                    (0, _chai.expect)(find('.fullscreen-modal').length, 'add subscriber modal displayed').to.equal(1);
                });

                // cancel the modal
                click('.fullscreen-modal .btn:contains("Cancel")');

                andThen(function () {
                    // it closes the add subscriber modal
                    (0, _chai.expect)(find('.fullscreen-modal').length, 'add subscriber modal displayed after cancel').to.equal(0);
                });

                // save a new subscriber
                click('.btn:contains("Add Subscriber")');
                fillIn('.fullscreen-modal input[name="email"]', 'test@example.com');
                click('.fullscreen-modal .btn:contains("Add")');

                andThen(function () {
                    // the add subscriber modal is closed
                    (0, _chai.expect)(find('.fullscreen-modal').length, 'add subscriber modal displayed after save').to.equal(0);

                    // the subscriber is added to the table
                    (0, _chai.expect)(find('.subscribers-table .lt-body .lt-row:first-of-type .lt-cell:first-of-type').text().trim(), 'first email in list after addition').to.equal('test@example.com');

                    // the table is scrolled to the top
                    // TODO: implement scroll to new record after addition
                    // expect(find('.subscribers-table').scrollTop(), 'scroll position after addition')
                    //     .to.equal(0);

                    // the subscriber total is updated
                    (0, _chai.expect)(find('#total-subscribers').text().trim(), 'subscribers total after addition').to.equal('41');
                });

                // saving a duplicate subscriber
                click('.btn:contains("Add Subscriber")');
                fillIn('.fullscreen-modal input[name="email"]', 'test@example.com');
                click('.fullscreen-modal .btn:contains("Add")');

                andThen(function () {
                    // the validation error is displayed
                    (0, _chai.expect)(find('.fullscreen-modal .error .response').text().trim(), 'duplicate email validation').to.equal('Email already exists.');

                    // the subscriber is not added to the table
                    (0, _chai.expect)(find('.lt-cell:contains(test@example.com)').length, 'number of "test@example.com rows"').to.equal(1);

                    // the subscriber total is unchanged
                    (0, _chai.expect)(find('#total-subscribers').text().trim(), 'subscribers total after failed add').to.equal('41');
                });

                // deleting a subscriber
                click('.fullscreen-modal .btn:contains("Cancel")');
                click('.subscribers-table tbody tr:first-of-type button:last-of-type');

                andThen(function () {
                    // it displays the delete subscriber modal
                    (0, _chai.expect)(find('.fullscreen-modal').length, 'delete subscriber modal displayed').to.equal(1);
                });

                // cancel the modal
                click('.fullscreen-modal .btn:contains("Cancel")');

                andThen(function () {
                    // return pauseTest();
                    // it closes the add subscriber modal
                    (0, _chai.expect)(find('.fullscreen-modal').length, 'delete subscriber modal displayed after cancel').to.equal(0);
                });

                click('.subscribers-table tbody tr:first-of-type button:last-of-type');
                click('.fullscreen-modal .btn:contains("Delete")');

                andThen(function () {
                    // the add subscriber modal is closed
                    (0, _chai.expect)(find('.fullscreen-modal').length, 'delete subscriber modal displayed after confirm').to.equal(0);

                    // the subscriber is removed from the table
                    (0, _chai.expect)(find('.subscribers-table .lt-body .lt-row:first-of-type .lt-cell:first-of-type').text().trim(), 'first email in list after addition').to.not.equal('test@example.com');

                    // the subscriber total is updated
                    (0, _chai.expect)(find('#total-subscribers').text().trim(), 'subscribers total after addition').to.equal('40');
                });

                // click the import subscribers button
                click('.btn:contains("Import CSV")');

                andThen(function () {
                    // it displays the import subscribers modal
                    (0, _chai.expect)(find('.fullscreen-modal').length, 'import subscribers modal displayed').to.equal(1);
                    (0, _chai.expect)(find('.fullscreen-modal input[type="file"]').length, 'import modal contains file input').to.equal(1);
                });

                // cancel the modal
                click('.fullscreen-modal .btn:contains("Cancel")');

                andThen(function () {
                    // it closes the import subscribers modal
                    (0, _chai.expect)(find('.fullscreen-modal').length, 'import subscribers modal displayed after cancel').to.equal(0);
                });

                click('.btn:contains("Import CSV")');
                fileUpload('.fullscreen-modal input[type="file"]');

                andThen(function () {
                    // modal title changes
                    (0, _chai.expect)(find('.fullscreen-modal h1').text().trim(), 'import modal title after import').to.equal('Import Successful');

                    // modal button changes
                    (0, _chai.expect)(find('.fullscreen-modal .modal-footer button').text().trim(), 'import modal button text after import').to.equal('Close');

                    // subscriber total is updated
                    (0, _chai.expect)(find('#total-subscribers').text().trim(), 'subscribers total after import').to.equal('90');

                    // table is reset

                    var _server$pretender$handledRequests$slice4 = server.pretender.handledRequests.slice(-1);

                    var _server$pretender$handledRequests$slice42 = _slicedToArray(_server$pretender$handledRequests$slice4, 1);

                    var lastRequest = _server$pretender$handledRequests$slice42[0];

                    (0, _chai.expect)(lastRequest.url, 'endpoint requested after import').to.match(/\/subscribers\/\?/);
                    (0, _chai.expect)(lastRequest.queryParams.page, 'page requested after import').to.equal('1');

                    (0, _chai.expect)(find('.subscribers-table .lt-body .lt-row').length, 'number of rows in table after import').to.equal(30);
                });

                // close modal
            });
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/acceptance/team-test', ['exports', 'mocha', 'chai', 'ember', 'ghost-admin/tests/helpers/start-app', 'ghost-admin/tests/helpers/destroy-app', 'ghost-admin/tests/helpers/ember-simple-auth', 'ghost-admin/tests/helpers/adapter-error', 'ember-cli-mirage'], function (exports, _mocha, _chai, _ember, _ghostAdminTestsHelpersStartApp, _ghostAdminTestsHelpersDestroyApp, _ghostAdminTestsHelpersEmberSimpleAuth, _ghostAdminTestsHelpersAdapterError, _emberCliMirage) {

    (0, _mocha.describe)('Acceptance: Team', function () {
        var application = undefined;

        (0, _mocha.beforeEach)(function () {
            application = (0, _ghostAdminTestsHelpersStartApp['default'])();
        });

        (0, _mocha.afterEach)(function () {
            (0, _ghostAdminTestsHelpersDestroyApp['default'])(application);
        });

        (0, _mocha.it)('redirects to signin when not authenticated', function () {
            (0, _ghostAdminTestsHelpersEmberSimpleAuth.invalidateSession)(application);
            visit('/team');

            andThen(function () {
                (0, _chai.expect)(currentURL()).to.equal('/signin');
            });
        });

        (0, _mocha.it)('redirects correctly when authenticated as author', function () {
            var role = server.create('role', { name: 'Author' });
            var user = server.create('user', { roles: [role], slug: 'test-user' });

            server.create('user', { slug: 'no-access' });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            visit('/team/no-access');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/team/test-user');
            });
        });

        (0, _mocha.it)('redirects correctly when authenticated as editor', function () {
            var role = server.create('role', { name: 'Editor' });
            var user = server.create('user', { roles: [role], slug: 'test-user' });

            server.create('user', { slug: 'no-access' });

            (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            visit('/team/no-access');

            andThen(function () {
                (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/team');
            });
        });

        (0, _mocha.describe)('when logged in', function () {
            (0, _mocha.beforeEach)(function () {
                var role = server.create('role', { name: 'Admininstrator' });
                var user = server.create('user', { roles: [role] });

                server.loadFixtures();

                return (0, _ghostAdminTestsHelpersEmberSimpleAuth.authenticateSession)(application);
            });

            (0, _mocha.it)('it renders and navigates correctly', function () {
                var user1 = server.create('user');
                var user2 = server.create('user');

                visit('/team');

                andThen(function () {
                    // doesn't do any redirecting
                    (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/team');

                    // it has correct page title
                    (0, _chai.expect)(document.title, 'page title').to.equal('Team - Test Blog');

                    // it shows 3 users in list (includes currently logged in user)
                    (0, _chai.expect)(find('.user-list .user-list-item').length, 'user list count').to.equal(3);

                    click('.user-list-item:last');

                    andThen(function () {
                        // url is correct
                        (0, _chai.expect)(currentURL(), 'url after clicking user').to.equal('/team/' + user2.slug);

                        // title is correct
                        (0, _chai.expect)(document.title, 'title after clicking user').to.equal('Team - User - Test Blog');

                        // view title should exist and be linkable and active
                        (0, _chai.expect)(find('.view-title a[href="/team"]').hasClass('active'), 'has linkable url back to team main page').to.be['true'];
                    });

                    click('.view-title a');

                    andThen(function () {
                        // url should be /team again
                        (0, _chai.expect)(currentURL(), 'url after clicking back').to.equal('/team');
                    });
                });
            });

            (0, _mocha.describe)('invite new user', function () {
                var emailInputField = '.fullscreen-modal input[name="email"]';

                // @TODO: Evaluate after the modal PR goes in
                (0, _mocha.it)('modal loads correctly', function () {
                    visit('/team');

                    andThen(function () {
                        // url is correct
                        (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/team');

                        // invite user button exists
                        (0, _chai.expect)(find('.view-actions .btn-green').html(), 'invite people button text').to.equal('Invite People');
                    });

                    click('.view-actions .btn-green');

                    andThen(function () {
                        var roleOptions = find('#new-user-role select option');

                        function checkOwnerExists() {
                            for (var i in roleOptions) {
                                if (roleOptions[i].tagName === 'option' && roleOptions[i].text === 'Owner') {
                                    return true;
                                }
                            }
                            return false;
                        }

                        function checkSelectedIsAuthor() {
                            for (var i in roleOptions) {
                                if (roleOptions[i].selected) {
                                    return roleOptions[i].text === 'Author';
                                }
                            }
                            return false;
                        }

                        // should be 3 available roles
                        (0, _chai.expect)(roleOptions.length, 'number of available roles').to.equal(3);

                        (0, _chai.expect)(checkOwnerExists(), 'owner role isn\'t available').to.be['false'];
                        (0, _chai.expect)(checkSelectedIsAuthor(), 'author role is selected initially').to.be['true'];
                    });
                });

                (0, _mocha.it)('sends an invite correctly', function () {
                    visit('/team');

                    andThen(function () {
                        (0, _chai.expect)(find('.user-list.invited-users .user-list-item').length, 'number of invited users').to.equal(0);
                    });

                    click('.view-actions .btn-green');
                    click(emailInputField);
                    triggerEvent(emailInputField, 'blur');

                    andThen(function () {
                        (0, _chai.expect)(find('.modal-body .form-group:first').hasClass('error'), 'email input has error status').to.be['true'];
                        (0, _chai.expect)(find('.modal-body .form-group:first .response').text()).to.contain('Please enter an email.');
                    });

                    fillIn(emailInputField, 'test@example.com');
                    click('.fullscreen-modal .btn-green');

                    andThen(function () {
                        (0, _chai.expect)(find('.user-list.invited-users .user-list-item').length, 'number of invited users').to.equal(1);
                        (0, _chai.expect)(find('.user-list.invited-users .user-list-item:first .name').text(), 'name of invited user').to.equal('test@example.com');
                    });

                    click('.user-list.invited-users .user-list-item:first .user-list-item-aside .user-list-action:contains("Revoke")');

                    andThen(function () {
                        (0, _chai.expect)(find('.user-list.invited-users .user-list-item').length, 'number of invited users').to.equal(0);
                    });
                });

                (0, _mocha.it)('fails sending an invite correctly', function () {
                    server.create('user', { email: 'test1@example.com' });
                    server.create('user', { email: 'test2@example.com', status: 'invited' });

                    visit('/team');

                    // check our users lists are what we expect
                    andThen(function () {
                        (0, _chai.expect)(find('.user-list.invited-users .user-list-item').length, 'number of invited users').to.equal(1);
                        // number of active users is 2 because of the logged-in user
                        (0, _chai.expect)(find('.user-list.active-users .user-list-item').length, 'number of active users').to.equal(2);
                    });

                    // click the "invite new user" button to open the modal
                    click('.view-actions .btn-green');

                    // fill in and submit the invite user modal with an existing user
                    fillIn(emailInputField, 'test1@example.com');
                    click('.fullscreen-modal .btn-green');

                    andThen(function () {
                        // check the inline-validation
                        (0, _chai.expect)(find('.fullscreen-modal .error .response').text().trim(), 'inviting existing user error').to.equal('A user with that email address already exists.');
                    });

                    // fill in and submit the invite user modal with an invited user
                    fillIn(emailInputField, 'test2@example.com');
                    click('.fullscreen-modal .btn-green');

                    andThen(function () {
                        // check the inline-validation
                        (0, _chai.expect)(find('.fullscreen-modal .error .response').text().trim(), 'inviting invited user error').to.equal('A user with that email address was already invited.');

                        // ensure that there's been no change in our user lists
                        (0, _chai.expect)(find('.user-list.invited-users .user-list-item').length, 'number of invited users after failed invites').to.equal(1);
                        (0, _chai.expect)(find('.user-list.active-users .user-list-item').length, 'number of active users after failed invites').to.equal(2);
                    });
                });
            });

            (0, _mocha.describe)('existing user', function () {
                var user = undefined;

                (0, _mocha.beforeEach)(function () {
                    server.create('user', {
                        slug: 'test-1',
                        name: 'Test User',
                        facebook: 'test',
                        twitter: '@test'
                    });

                    server.loadFixtures();
                });

                (0, _mocha.it)('input fields reset and validate correctly', function () {
                    // test user name
                    visit('/team/test-1');

                    andThen(function () {
                        (0, _chai.expect)(currentURL(), 'currentURL').to.equal('/team/test-1');
                        (0, _chai.expect)(find('.user-details-top .first-form-group input.user-name').val(), 'current user name').to.equal('Test User');
                    });

                    // test empty user name
                    fillIn('.user-details-top .first-form-group input.user-name', '');
                    triggerEvent('.user-details-top .first-form-group input.user-name', 'blur');

                    andThen(function () {
                        (0, _chai.expect)(find('.user-details-top .first-form-group').hasClass('error'), 'username input is in error state with blank input').to.be['true'];
                    });

                    // test too long user name
                    fillIn('.user-details-top .first-form-group input.user-name', new Array(160).join('a'));
                    triggerEvent('.user-details-top .first-form-group input.user-name', 'blur');

                    andThen(function () {
                        (0, _chai.expect)(find('.user-details-top .first-form-group').hasClass('error'), 'username input is in error state with too long input').to.be['true'];
                    });

                    // reset name field
                    fillIn('.user-details-top .first-form-group input.user-name', 'Test User');

                    andThen(function () {
                        (0, _chai.expect)(find('.user-details-bottom input[name="user"]').val(), 'slug value is default').to.equal('test-1');
                    });

                    fillIn('.user-details-bottom input[name="user"]', '');
                    triggerEvent('.user-details-bottom input[name="user"]', 'blur');

                    andThen(function () {
                        (0, _chai.expect)(find('.user-details-bottom input[name="user"]').val(), 'slug value is reset to original upon empty string').to.equal('test-1');
                    });

                    fillIn('.user-details-bottom input[name="user"]', 'white space');
                    triggerEvent('.user-details-bottom input[name="user"]', 'blur');

                    andThen(function () {
                        (0, _chai.expect)(find('.user-details-bottom input[name="user"]').val(), 'slug value is correctly dasherized').to.equal('white-space');
                    });

                    fillIn('.user-details-bottom input[name="email"]', 'thisisnotanemail');
                    triggerEvent('.user-details-bottom input[name="email"]', 'blur');

                    andThen(function () {
                        (0, _chai.expect)(find('.user-details-bottom .form-group:nth-of-type(2)').hasClass('error'), 'email input should be in error state with invalid email').to.be['true'];
                    });

                    fillIn('.user-details-bottom input[name="email"]', 'test@example.com');
                    fillIn('#user-location', new Array(160).join('a'));
                    triggerEvent('#user-location', 'blur');

                    andThen(function () {
                        (0, _chai.expect)(find('.user-details-bottom .form-group:nth-of-type(3)').hasClass('error'), 'location input should be in error state').to.be['true'];
                    });

                    fillIn('#user-location', '');
                    fillIn('#user-website', 'thisisntawebsite');
                    triggerEvent('#user-website', 'blur');

                    andThen(function () {
                        (0, _chai.expect)(find('.user-details-bottom .form-group:nth-of-type(4)').hasClass('error'), 'website input should be in error state').to.be['true'];
                    });

                    // Testing Facebook input

                    andThen(function () {
                        // displays initial value
                        (0, _chai.expect)(find('#user-facebook').val(), 'initial facebook value').to.equal('https://www.facebook.com/test');
                    });

                    triggerEvent('#user-facebook', 'focus');
                    triggerEvent('#user-facebook', 'blur');

                    andThen(function () {
                        // regression test: we still have a value after the input is
                        // focused and then blurred without any changes
                        (0, _chai.expect)(find('#user-facebook').val(), 'facebook value after blur with no change').to.equal('https://www.facebook.com/test');
                    });

                    fillIn('#user-facebook', '');
                    fillIn('#user-facebook', ')(*&%^%)');
                    triggerEvent('#user-facebook', 'blur');

                    andThen(function () {
                        (0, _chai.expect)(find('.user-details-bottom .form-group:nth-of-type(5)').hasClass('error'), 'facebook input should be in error state').to.be['true'];
                    });

                    fillIn('#user-facebook', '');
                    fillIn('#user-facebook', 'pages/)(*&%^%)');
                    triggerEvent('#user-facebook', 'blur');

                    andThen(function () {
                        (0, _chai.expect)(find('#user-facebook').val()).to.be.equal('https://www.facebook.com/pages/)(*&%^%)');
                        (0, _chai.expect)(find('.user-details-bottom .form-group:nth-of-type(5)').hasClass('error'), 'facebook input should be in error state').to.be['false'];
                    });

                    fillIn('#user-facebook', '');
                    fillIn('#user-facebook', 'testing');
                    triggerEvent('#user-facebook', 'blur');

                    andThen(function () {
                        (0, _chai.expect)(find('#user-facebook').val()).to.be.equal('https://www.facebook.com/testing');
                        (0, _chai.expect)(find('.user-details-bottom .form-group:nth-of-type(5)').hasClass('error'), 'facebook input should be in error state').to.be['false'];
                    });

                    fillIn('#user-facebook', '');
                    fillIn('#user-facebook', 'somewebsite.com/pages/some-facebook-page/857469375913?ref=ts');
                    triggerEvent('#user-facebook', 'blur');

                    andThen(function () {
                        (0, _chai.expect)(find('#user-facebook').val()).to.be.equal('https://www.facebook.com/pages/some-facebook-page/857469375913?ref=ts');
                        (0, _chai.expect)(find('.user-details-bottom .form-group:nth-of-type(5)').hasClass('error'), 'facebook input should be in error state').to.be['false'];
                    });

                    fillIn('#user-facebook', '');
                    fillIn('#user-facebook', 'test');
                    triggerEvent('#user-facebook', 'blur');

                    andThen(function () {
                        (0, _chai.expect)(find('.user-details-bottom .form-group:nth-of-type(5)').hasClass('error'), 'facebook input should be in error state').to.be['true'];
                    });

                    fillIn('#user-facebook', '');
                    fillIn('#user-facebook', 'http://twitter.com/testuser');
                    triggerEvent('#user-facebook', 'blur');

                    andThen(function () {
                        (0, _chai.expect)(find('#user-facebook').val()).to.be.equal('https://www.facebook.com/testuser');
                        (0, _chai.expect)(find('.user-details-bottom .form-group:nth-of-type(5)').hasClass('error'), 'facebook input should be in error state').to.be['false'];
                    });

                    fillIn('#user-facebook', '');
                    fillIn('#user-facebook', 'facebook.com/testing');
                    triggerEvent('#user-facebook', 'blur');

                    andThen(function () {
                        (0, _chai.expect)(find('#user-facebook').val()).to.be.equal('https://www.facebook.com/testing');
                        (0, _chai.expect)(find('.user-details-bottom .form-group:nth-of-type(5)').hasClass('error'), 'facebook input should be in error state').to.be['false'];
                    });

                    // Testing Twitter input

                    andThen(function () {
                        // loads fixtures and performs transform
                        (0, _chai.expect)(find('#user-twitter').val(), 'initial twitter value').to.equal('https://twitter.com/test');
                    });

                    triggerEvent('#user-twitter', 'focus');
                    triggerEvent('#user-twitter', 'blur');

                    andThen(function () {
                        // regression test: we still have a value after the input is
                        // focused and then blurred without any changes
                        (0, _chai.expect)(find('#user-twitter').val(), 'twitter value after blur with no change').to.equal('https://twitter.com/test');
                    });

                    fillIn('#user-twitter', '');
                    fillIn('#user-twitter', ')(*&%^%)');
                    triggerEvent('#user-twitter', 'blur');

                    andThen(function () {
                        (0, _chai.expect)(find('.user-details-bottom .form-group:nth-of-type(6)').hasClass('error'), 'twitter input should be in error state').to.be['true'];
                    });

                    fillIn('#user-twitter', '');
                    fillIn('#user-twitter', 'name');
                    triggerEvent('#user-twitter', 'blur');

                    andThen(function () {
                        (0, _chai.expect)(find('#user-twitter').val()).to.be.equal('https://twitter.com/name');
                        (0, _chai.expect)(find('.user-details-bottom .form-group:nth-of-type(6)').hasClass('error'), 'twitter input should be in error state').to.be['false'];
                    });

                    fillIn('#user-twitter', '');
                    fillIn('#user-twitter', 'http://github.com/user');
                    triggerEvent('#user-twitter', 'blur');

                    andThen(function () {
                        (0, _chai.expect)(find('#user-twitter').val()).to.be.equal('https://twitter.com/user');
                        (0, _chai.expect)(find('.user-details-bottom .form-group:nth-of-type(6)').hasClass('error'), 'twitter input should be in error state').to.be['false'];
                    });

                    fillIn('#user-twitter', '');
                    fillIn('#user-twitter', 'twitter.com/user');
                    triggerEvent('#user-twitter', 'blur');

                    andThen(function () {
                        (0, _chai.expect)(find('#user-twitter').val()).to.be.equal('https://twitter.com/user');
                        (0, _chai.expect)(find('.user-details-bottom .form-group:nth-of-type(6)').hasClass('error'), 'twitter input should be in error state').to.be['false'];
                    });

                    fillIn('#user-website', '');
                    fillIn('#user-bio', new Array(210).join('a'));
                    triggerEvent('#user-bio', 'blur');

                    andThen(function () {
                        (0, _chai.expect)(find('.user-details-bottom .form-group:nth-of-type(7)').hasClass('error'), 'bio input should be in error state').to.be['true'];
                    });
                });
            });

            (0, _mocha.it)('redirects to 404 when tag does not exist', function () {
                server.get('/users/slug/unknown/', function () {
                    return new _emberCliMirage['default'].Response(404, { 'Content-Type': 'application/json' }, { errors: [{ message: 'User not found.', errorType: 'NotFoundError' }] });
                });

                (0, _ghostAdminTestsHelpersAdapterError.errorOverride)();

                visit('/team/unknown');

                andThen(function () {
                    (0, _ghostAdminTestsHelpersAdapterError.errorReset)();
                    (0, _chai.expect)(currentPath()).to.equal('error404');
                    (0, _chai.expect)(currentURL()).to.equal('/team/unknown');
                });
            });
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/helpers/adapter-error', ['exports', 'ember'], function (exports, _ember) {
    exports.errorOverride = errorOverride;
    exports.errorReset = errorReset;

    // This is needed for testing error responses in acceptance tests
    // See http://williamsbdev.com/posts/testing-rsvp-errors-handled-globally/

    var originalException = undefined;
    var originalLoggerError = undefined;

    function errorOverride() {
        originalException = _ember['default'].Test.adapter.exception;
        originalLoggerError = _ember['default'].Logger.error;
        _ember['default'].Test.adapter.exception = function () {};
        _ember['default'].Logger.error = function () {};
    }

    function errorReset() {
        _ember['default'].Test.adapter.exception = originalException;
        _ember['default'].Logger.error = originalLoggerError;
    }
});
define('ghost-admin/tests/helpers/destroy-app', ['exports', 'ember'], function (exports, _ember) {
    exports['default'] = destroyApp;

    function destroyApp(application) {
        _ember['default'].run(application, 'destroy');
    }
});
define('ghost-admin/tests/helpers/ember-basic-dropdown', ['exports'], function (exports) {
  exports.clickTrigger = clickTrigger;
  exports.tapTrigger = tapTrigger;

  function clickTrigger(scope) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var selector = '.ember-basic-dropdown-trigger';
    if (scope) {
      selector = scope + ' ' + selector;
    }
    var event = new window.Event('mousedown', { bubbles: true, cancelable: true, view: window });
    Object.keys(options).forEach(function (key) {
      return event[key] = options[key];
    });
    Ember.run(function () {
      return Ember.$(selector)[0].dispatchEvent(event);
    });
  }

  function tapTrigger(scope) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var selector = '.ember-basic-dropdown-trigger';
    if (scope) {
      selector = scope + ' ' + selector;
    }
    var touchStartEvent = new window.Event('touchstart', { bubbles: true, cancelable: true, view: window });
    Object.keys(options).forEach(function (key) {
      return touchStartEvent[key] = options[key];
    });
    Ember.run(function () {
      return Ember.$(selector)[0].dispatchEvent(touchStartEvent);
    });
    var touchEndEvent = new window.Event('touchend', { bubbles: true, cancelable: true, view: window });
    Object.keys(options).forEach(function (key) {
      return touchEndEvent[key] = options[key];
    });
    Ember.run(function () {
      return Ember.$(selector)[0].dispatchEvent(touchEndEvent);
    });
  }
});
define('ghost-admin/tests/helpers/ember-power-select', ['exports', 'ember'], function (exports, _ember) {
  exports.nativeMouseDown = nativeMouseDown;
  exports.nativeMouseUp = nativeMouseUp;
  exports.triggerKeydown = triggerKeydown;
  exports.typeInSearch = typeInSearch;
  exports.clickTrigger = clickTrigger;
  exports.nativeTouch = nativeTouch;
  exports.touchTrigger = touchTrigger;

  // Helpers for integration tests

  function typeText(selector, text) {
    var $selector = $($(selector).get(0)); // Only interact with the first result
    $selector.val(text);
    var event = document.createEvent('Events');
    event.initEvent('input', true, true);
    $selector[0].dispatchEvent(event);
  }

  function fireNativeMouseEvent(eventType, selectorOrDomElement) {
    var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var event = new window.Event(eventType, { bubbles: true, cancelable: true, view: window });
    Object.keys(options).forEach(function (key) {
      return event[key] = options[key];
    });
    var target = undefined;
    if (typeof selectorOrDomElement === 'string') {
      target = _ember['default'].$(selectorOrDomElement)[0];
    } else {
      target = selectorOrDomElement;
    }
    _ember['default'].run(function () {
      return target.dispatchEvent(event);
    });
  }

  function nativeMouseDown(selectorOrDomElement, options) {
    fireNativeMouseEvent('mousedown', selectorOrDomElement, options);
  }

  function nativeMouseUp(selectorOrDomElement, options) {
    fireNativeMouseEvent('mouseup', selectorOrDomElement, options);
  }

  function triggerKeydown(domElement, k) {
    var oEvent = document.createEvent('Events');
    oEvent.initEvent('keydown', true, true);
    $.extend(oEvent, {
      view: window,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      keyCode: k,
      charCode: k
    });
    _ember['default'].run(function () {
      domElement.dispatchEvent(oEvent);
    });
  }

  function typeInSearch(text) {
    _ember['default'].run(function () {
      typeText('.ember-power-select-search-input, .ember-power-select-search input, .ember-power-select-trigger-multiple-input, input[type="search"]', text);
    });
  }

  function clickTrigger(scope) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var selector = '.ember-power-select-trigger';
    if (scope) {
      selector = scope + ' ' + selector;
    }
    nativeMouseDown(selector, options);
  }

  function nativeTouch(selectorOrDomElement) {
    var event = new window.Event('touchstart', { bubbles: true, cancelable: true, view: window });
    var target = undefined;

    if (typeof selectorOrDomElement === 'string') {
      target = _ember['default'].$(selectorOrDomElement)[0];
    } else {
      target = selectorOrDomElement;
    }
    _ember['default'].run(function () {
      return target.dispatchEvent(event);
    });
    _ember['default'].run(function () {
      event = new window.Event('touchend', { bubbles: true, cancelable: true, view: window });
      target.dispatchEvent(event);
    });
  }

  function touchTrigger() {
    var selector = '.ember-power-select-trigger';
    nativeTouch(selector);
  }

  // Helpers for acceptance tests

  exports['default'] = function () {
    var isEmberOne = _ember['default'].VERSION.match(/1\.13/);

    _ember['default'].Test.registerAsyncHelper('selectChoose', function (app, cssPath, value) {
      var match = find(cssPath).find('.ember-power-select-trigger').attr('id').match(/\d+$/);
      var id = match[0];
      // If the dropdown is closed, open it
      if (_ember['default'].$('.ember-power-select-dropdown-ember' + id).length === 0) {
        nativeMouseDown(cssPath + ' .ember-power-select-trigger');
        wait();
      }

      // Select the option with the given text
      andThen(function () {
        var potentialTargets = $('.ember-power-select-dropdown-ember' + id + ' .ember-power-select-option:contains("' + value + '")').toArray();
        var target = undefined;
        if (potentialTargets.length > 1) {
          target = _ember['default'].A(potentialTargets).find(function (t) {
            return t.textContent.trim() === value;
          }) || potentialTargets[0];
        } else {
          target = potentialTargets[0];
        }
        nativeMouseUp(target);
      });
    });

    _ember['default'].Test.registerAsyncHelper('selectSearch', function (app, cssPath, value) {
      var id = find(cssPath).find('.ember-power-select-trigger').attr('id').replace(/\D/g, '');
      var isMultipleSelect = _ember['default'].$(cssPath + ' .ember-power-select-trigger-multiple-input').length > 0;

      var dropdownIsClosed = _ember['default'].$('.ember-power-select-dropdown-ember' + id).length === 0;
      if (dropdownIsClosed) {
        nativeMouseDown(cssPath + ' .ember-power-select-trigger');
        wait();
      }
      var isDefaultSingleSelect = _ember['default'].$('.ember-power-select-search-input').length > 0;

      if (isMultipleSelect) {
        fillIn(cssPath + ' .ember-power-select-trigger-multiple-input', value);
        if (isEmberOne) {
          triggerEvent(cssPath + ' .ember-power-select-trigger-multiple-input', 'input');
        }
      } else if (isDefaultSingleSelect) {
        fillIn('.ember-power-select-search-input', value);
        if (isEmberOne) {
          triggerEvent('.ember-power-select-dropdown-ember' + id + ' .ember-power-select-search-input', 'input');
        }
      } else {
        // It's probably a customized version
        var inputIsInTrigger = !!find(cssPath + ' .ember-power-select-trigger input[type=search]')[0];
        if (inputIsInTrigger) {
          fillIn(cssPath + ' .ember-power-select-trigger input[type=search]', value);
          if (isEmberOne) {
            triggerEvent(cssPath + ' .ember-power-select-trigger input[type=search]', 'input');
          }
        } else {
          fillIn('.ember-power-select-dropdown-ember' + id + ' .ember-power-select-search-input[type=search]', 'input');
          if (isEmberOne) {
            triggerEvent('.ember-power-select-dropdown-ember' + id + ' .ember-power-select-search-input[type=search]', 'input');
          }
        }
      }
    });

    _ember['default'].Test.registerAsyncHelper('removeMultipleOption', function (app, cssPath, value) {
      var elem = find(cssPath + ' .ember-power-select-multiple-options > li:contains(' + value + ') > .ember-power-select-multiple-remove-btn').get(0);
      try {
        nativeMouseDown(elem);
        wait();
      } catch (e) {
        console.warn('css path to remove btn not found');
        throw e;
      }
    });

    _ember['default'].Test.registerAsyncHelper('clearSelected', function (app, cssPath) {
      var elem = find(cssPath + ' .ember-power-select-clear-btn').get(0);
      try {
        nativeMouseDown(elem);
        wait();
      } catch (e) {
        console.warn('css path to clear btn not found');
        throw e;
      }
    });
  };
});
define('ghost-admin/tests/helpers/ember-simple-auth', ['exports', 'ember-simple-auth/authenticators/test'], function (exports, _emberSimpleAuthAuthenticatorsTest) {
  exports.authenticateSession = authenticateSession;
  exports.currentSession = currentSession;
  exports.invalidateSession = invalidateSession;

  var TEST_CONTAINER_KEY = 'authenticator:test';

  function ensureAuthenticator(app, container) {
    var authenticator = container.lookup(TEST_CONTAINER_KEY);
    if (!authenticator) {
      app.register(TEST_CONTAINER_KEY, _emberSimpleAuthAuthenticatorsTest['default']);
    }
  }

  function authenticateSession(app, sessionData) {
    var container = app.__container__;

    var session = container.lookup('service:session');
    ensureAuthenticator(app, container);
    session.authenticate(TEST_CONTAINER_KEY, sessionData);
    return wait();
  }

  ;

  function currentSession(app) {
    return app.__container__.lookup('service:session');
  }

  ;

  function invalidateSession(app) {
    var session = app.__container__.lookup('service:session');
    if (session.get('isAuthenticated')) {
      session.invalidate();
    }
    return wait();
  }

  ;
});
define('ghost-admin/tests/helpers/ember-sortable/test-helpers', ['exports', 'ember-sortable/helpers/drag', 'ember-sortable/helpers/reorder'], function (exports, _emberSortableHelpersDrag, _emberSortableHelpersReorder) {});
define('ghost-admin/tests/helpers/file-upload', ['exports', 'ember'], function (exports, _ember) {
    exports.createFile = createFile;
    exports.fileUpload = fileUpload;

    function createFile() {
        var content = arguments.length <= 0 || arguments[0] === undefined ? ['test'] : arguments[0];
        var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
        var name = options.name;
        var type = options.type;

        var file = new Blob(content, { type: type ? type : 'text/plain' });
        file.name = name ? name : 'test.txt';

        return file;
    }

    function fileUpload($element, content, options) {
        var file = createFile(content, options);
        var event = _ember['default'].$.Event('change', {
            testingFiles: [file]
        });

        $element.trigger(event);
    }

    exports['default'] = _ember['default'].Test.registerAsyncHelper('fileUpload', function (app, selector, content, options) {
        var file = createFile(content, options);

        return triggerEvent(selector, 'change', { foor: 'bar', testingFiles: [file] });
    });
});
/* global Blob */
define('ghost-admin/tests/helpers/module-for-acceptance', ['exports', 'qunit', 'ghost-admin/tests/helpers/start-app', 'ghost-admin/tests/helpers/destroy-app'], function (exports, _qunit, _ghostAdminTestsHelpersStartApp, _ghostAdminTestsHelpersDestroyApp) {
    exports['default'] = function (name) {
        var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        (0, _qunit.module)(name, {
            beforeEach: function beforeEach() {
                this.application = (0, _ghostAdminTestsHelpersStartApp['default'])();

                if (options.beforeEach) {
                    options.beforeEach.apply(options, arguments);
                }
            },

            afterEach: function afterEach() {
                if (options.afterEach) {
                    options.afterEach.apply(options, arguments);
                }

                (0, _ghostAdminTestsHelpersDestroyApp['default'])(this.application);
            }
        });
    };
});
define('ghost-admin/tests/helpers/resolver', ['exports', 'ghost-admin/resolver', 'ghost-admin/config/environment'], function (exports, _ghostAdminResolver, _ghostAdminConfigEnvironment) {

    var resolver = _ghostAdminResolver['default'].create();

    resolver.namespace = {
        modulePrefix: _ghostAdminConfigEnvironment['default'].modulePrefix,
        podModulePrefix: _ghostAdminConfigEnvironment['default'].podModulePrefix
    };

    exports['default'] = resolver;
});
define('ghost-admin/tests/helpers/start-app', ['exports', 'ember', 'ghost-admin/app', 'ghost-admin/config/environment', 'ghost-admin/tests/helpers/file-upload'], function (exports, _ember, _ghostAdminApp, _ghostAdminConfigEnvironment, _ghostAdminTestsHelpersFileUpload) {
    exports['default'] = startApp;
    var assign = _ember['default'].assign;
    var run = _ember['default'].run;

    function startApp(attrs) {
        var attributes = assign({}, _ghostAdminConfigEnvironment['default'].APP);
        var application = undefined;

        // use defaults, but you can override;
        attributes = assign(attributes, attrs);

        run(function () {
            application = _ghostAdminApp['default'].create(attributes);
            application.setupForTesting();
            application.injectTestHelpers();
        });

        return application;
    }
});
define('ghost-admin/tests/integration/adapters/tag-test', ['exports', 'chai', 'ember-mocha', 'pretender'], function (exports, _chai, _emberMocha, _pretender) {

    (0, _emberMocha.describeModule)('adapter:tag', 'Integration: Adapter: tag', {
        integration: true
    }, function () {
        var server = undefined,
            store = undefined;

        beforeEach(function () {
            store = this.container.lookup('service:store');
            server = new _pretender['default']();
        });

        afterEach(function () {
            server.shutdown();
        });

        (0, _emberMocha.it)('loads tags from regular endpoint when all are fetched', function (done) {
            server.get('/ghost/api/v0.1/tags/', function () {
                return [200, { 'Content-Type': 'application/json' }, JSON.stringify({ tags: [{
                        id: 1,
                        name: 'Tag 1',
                        slug: 'tag-1'
                    }, {
                        id: 2,
                        name: 'Tag 2',
                        slug: 'tag-2'
                    }] })];
            });

            store.findAll('tag', { reload: true }).then(function (tags) {
                (0, _chai.expect)(tags).to.be.ok;
                (0, _chai.expect)(tags.objectAtContent(0).get('name')).to.equal('Tag 1');
                done();
            });
        });

        (0, _emberMocha.it)('loads tag from slug endpoint when single tag is queried and slug is passed in', function (done) {
            server.get('/ghost/api/v0.1/tags/slug/tag-1/', function () {
                return [200, { 'Content-Type': 'application/json' }, JSON.stringify({ tags: [{
                        id: 1,
                        slug: 'tag-1',
                        name: 'Tag 1'
                    }] })];
            });

            store.queryRecord('tag', { slug: 'tag-1' }).then(function (tag) {
                (0, _chai.expect)(tag).to.be.ok;
                (0, _chai.expect)(tag.get('name')).to.equal('Tag 1');
                done();
            });
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/adapters/user-test', ['exports', 'chai', 'ember-mocha', 'pretender'], function (exports, _chai, _emberMocha, _pretender) {

    (0, _emberMocha.describeModule)('adapter:user', 'Integration: Adapter: user', {
        integration: true
    }, function () {
        var server = undefined,
            store = undefined;

        beforeEach(function () {
            store = this.container.lookup('service:store');
            server = new _pretender['default']();
        });

        afterEach(function () {
            server.shutdown();
        });

        (0, _emberMocha.it)('loads users from regular endpoint when all are fetched', function (done) {
            server.get('/ghost/api/v0.1/users/', function () {
                return [200, { 'Content-Type': 'application/json' }, JSON.stringify({ users: [{
                        id: 1,
                        name: 'User 1',
                        slug: 'user-1'
                    }, {
                        id: 2,
                        name: 'User 2',
                        slug: 'user-2'
                    }] })];
            });

            store.findAll('user', { reload: true }).then(function (users) {
                (0, _chai.expect)(users).to.be.ok;
                (0, _chai.expect)(users.objectAtContent(0).get('name')).to.equal('User 1');
                done();
            });
        });

        (0, _emberMocha.it)('loads user from slug endpoint when single user is queried and slug is passed in', function (done) {
            server.get('/ghost/api/v0.1/users/slug/user-1/', function () {
                return [200, { 'Content-Type': 'application/json' }, JSON.stringify({ users: [{
                        id: 1,
                        slug: 'user-1',
                        name: 'User 1'
                    }] })];
            });

            store.queryRecord('user', { slug: 'user-1' }).then(function (user) {
                (0, _chai.expect)(user).to.be.ok;
                (0, _chai.expect)(user.get('name')).to.equal('User 1');
                done();
            });
        });

        (0, _emberMocha.it)('handles "include" parameter when querying single user via slug', function (done) {
            server.get('/ghost/api/v0.1/users/slug/user-1/', function (request) {
                var params = request.queryParams;
                (0, _chai.expect)(params.include, 'include query').to.equal('roles,count.posts');

                return [200, { 'Content-Type': 'application/json' }, JSON.stringify({ users: [{
                        id: 1,
                        slug: 'user-1',
                        name: 'User 1',
                        count: {
                            posts: 5
                        }
                    }] })];
            });

            store.queryRecord('user', { slug: 'user-1', include: 'count.posts' }).then(function (user) {
                (0, _chai.expect)(user).to.be.ok;
                (0, _chai.expect)(user.get('name')).to.equal('User 1');
                (0, _chai.expect)(user.get('count.posts')).to.equal(5);
                done();
            });
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/components/gh-alert-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeComponent)('gh-alert', 'Integration: Component: gh-alert', {
        integration: true
    }, function () {
        (0, _emberMocha.it)('renders', function () {
            this.set('message', { message: 'Test message', type: 'success' });

            this.render(Ember.HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 28
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-alert', [], ['message', ['subexpr', '@mut', [['get', 'message', ['loc', [null, [1, 19], [1, 26]]]]], [], []]], ['loc', [null, [1, 0], [1, 28]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            (0, _chai.expect)(this.$('article.gh-alert')).to.have.length(1);
            var $alert = this.$('.gh-alert');

            (0, _chai.expect)($alert.text()).to.match(/Test message/);
        });

        (0, _emberMocha.it)('maps message types to CSS classes', function () {
            this.set('message', { message: 'Test message', type: 'success' });

            this.render(Ember.HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 28
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-alert', [], ['message', ['subexpr', '@mut', [['get', 'message', ['loc', [null, [1, 19], [1, 26]]]]], [], []]], ['loc', [null, [1, 0], [1, 28]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $alert = this.$('.gh-alert');

            this.set('message.type', 'success');
            (0, _chai.expect)($alert.hasClass('gh-alert-green'), 'success class isn\'t green').to.be['true'];

            this.set('message.type', 'error');
            (0, _chai.expect)($alert.hasClass('gh-alert-red'), 'success class isn\'t red').to.be['true'];

            this.set('message.type', 'warn');
            (0, _chai.expect)($alert.hasClass('gh-alert-yellow'), 'success class isn\'t yellow').to.be['true'];

            this.set('message.type', 'info');
            (0, _chai.expect)($alert.hasClass('gh-alert-blue'), 'success class isn\'t blue').to.be['true'];
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/components/gh-alerts-test', ['exports', 'chai', 'ember-mocha', 'ember'], function (exports, _chai, _emberMocha, _ember) {
    var run = _ember['default'].run;

    var emberA = _ember['default'].A;

    var notificationsStub = _ember['default'].Service.extend({
        alerts: emberA()
    });

    (0, _emberMocha.describeComponent)('gh-alerts', 'Integration: Component: gh-alerts', {
        integration: true
    }, function () {
        beforeEach(function () {
            this.register('service:notifications', notificationsStub);
            this.inject.service('notifications', { as: 'notifications' });

            this.set('notifications.alerts', [{ message: 'First', type: 'error' }, { message: 'Second', type: 'warn' }]);
        });

        (0, _emberMocha.it)('renders', function () {
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 13
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['content', 'gh-alerts', ['loc', [null, [1, 0], [1, 13]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _chai.expect)(this.$('.gh-alerts').length).to.equal(1);
            (0, _chai.expect)(this.$('.gh-alerts').children().length).to.equal(2);

            this.set('notifications.alerts', emberA());
            (0, _chai.expect)(this.$('.gh-alerts').children().length).to.equal(0);
        });

        (0, _emberMocha.it)('triggers "notify" action when message count changes', function () {
            var expectedCount = 0;

            // test double for notify action
            this.set('notify', function (count) {
                return (0, _chai.expect)(count).to.equal(expectedCount);
            });

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 36
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-alerts', [], ['notify', ['subexpr', 'action', [['get', 'notify', ['loc', [null, [1, 27], [1, 33]]]]], [], ['loc', [null, [1, 19], [1, 34]]]]], ['loc', [null, [1, 0], [1, 36]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            expectedCount = 3;
            this.get('notifications.alerts').pushObject({ message: 'Third', type: 'success' });

            expectedCount = 0;
            this.set('notifications.alerts', emberA());
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/components/gh-cm-editor-test', ['exports', 'chai', 'ember-mocha', 'ember'], function (exports, _chai, _emberMocha, _ember) {
    var run = _ember['default'].run;

    (0, _emberMocha.describeComponent)('gh-cm-editor', 'Integration: Component: gh-cm-editor', {
        integration: true
    }, function () {
        (0, _emberMocha.it)('handles editor events', function () {
            this.set('text', '');

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 44
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-cm-editor', [], ['class', 'gh-input', 'value', ['subexpr', '@mut', [['get', 'text', ['loc', [null, [1, 38], [1, 42]]]]], [], []]], ['loc', [null, [1, 0], [1, 44]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var input = this.$('.gh-input');

            (0, _chai.expect)(input.hasClass('focused'), 'has focused class on first render').to.be['false'];

            run(function () {
                input.find('textarea').trigger('focus');
            });

            (0, _chai.expect)(input.hasClass('focused'), 'has focused class after focus').to.be['true'];

            run(function () {
                input.find('textarea').trigger('blur');
            });

            (0, _chai.expect)(input.hasClass('focused'), 'loses focused class on blur').to.be['false'];

            run(function () {
                // access CodeMirror directly as it doesn't pick up changes
                // to the textarea
                var cm = input.find('.CodeMirror').get(0).CodeMirror;
                cm.setValue('Testing');
            });

            (0, _chai.expect)(this.get('text'), 'text value after CM editor change').to.equal('Testing');
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/components/gh-datetime-input-test', ['exports', 'chai', 'ember-mocha', 'ember'], function (exports, _chai, _emberMocha, _ember) {
    var run = _ember['default'].run;

    (0, _emberMocha.describeComponent)('gh-datetime-input', 'Integration: Component: gh-datetime-input', {
        integration: true
    }, function () {
        (0, _emberMocha.it)('renders', function () {
            // renders the component on the page
            // this.render(hbs`{{gh-datetime-input}}`);
            //
            // expect(this.$('.ember-text-field gh-input')).to.have.length(1);
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/components/gh-feature-flag-test', ['exports', 'chai', 'ember-mocha', 'ember', 'ember-test-helpers/wait'], function (exports, _chai, _emberMocha, _ember, _emberTestHelpersWait) {

    var featureStub = _ember['default'].Service.extend({
        testFlag: true
    });

    (0, _emberMocha.describeComponent)('gh-feature-flag', 'Integration: Component: gh-feature-flag', {
        integration: true
    }, function () {
        var server = undefined;

        beforeEach(function () {
            this.register('service:feature', featureStub);
            this.inject.service('feature', { as: 'feature' });
        });

        (0, _emberMocha.it)('renders properties correctly', function () {
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 30
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-feature-flag', ['testFlag'], [], ['loc', [null, [1, 0], [1, 30]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _chai.expect)(this.$()).to.have.length(1);
            (0, _chai.expect)(this.$('label').attr('for')).to.equal(this.$('input[type="checkbox"]').attr('id'));
        });

        (0, _emberMocha.it)('renders correctly when flag is set to true', function () {
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 30
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-feature-flag', ['testFlag'], [], ['loc', [null, [1, 0], [1, 30]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _chai.expect)(this.$()).to.have.length(1);
            (0, _chai.expect)(this.$('label input[type="checkbox"]').prop('checked')).to.be['true'];
        });

        (0, _emberMocha.it)('renders correctly when flag is set to false', function () {
            this.set('feature.testFlag', false);

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 30
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-feature-flag', ['testFlag'], [], ['loc', [null, [1, 0], [1, 30]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _chai.expect)(this.$()).to.have.length(1);

            (0, _chai.expect)(this.$('label input[type="checkbox"]').prop('checked')).to.be['false'];
        });

        (0, _emberMocha.it)('updates to reflect changes in flag property', function () {
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 30
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-feature-flag', ['testFlag'], [], ['loc', [null, [1, 0], [1, 30]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _chai.expect)(this.$()).to.have.length(1);

            (0, _chai.expect)(this.$('label input[type="checkbox"]').prop('checked')).to.be['true'];

            this.$('label').click();

            (0, _chai.expect)(this.$('label input[type="checkbox"]').prop('checked')).to.be['false'];
        });
    });
});
define('ghost-admin/tests/integration/components/gh-file-uploader-test', ['exports', 'chai', 'ember-mocha', 'ember', 'pretender', 'ember-test-helpers/wait', 'sinon', 'ghost-admin/tests/helpers/file-upload'], function (exports, _chai, _emberMocha, _ember, _pretender, _emberTestHelpersWait, _sinon, _ghostAdminTestsHelpersFileUpload) {
    var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

    var run = _ember['default'].run;

    var stubSuccessfulUpload = function stubSuccessfulUpload(server) {
        var delay = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

        server.post('/ghost/api/v0.1/uploads/', function () {
            return [200, { 'Content-Type': 'application/json' }, '"/content/images/test.png"'];
        }, delay);
    };

    var stubFailedUpload = function stubFailedUpload(server, code, error) {
        var delay = arguments.length <= 3 || arguments[3] === undefined ? 0 : arguments[3];

        server.post('/ghost/api/v0.1/uploads/', function () {
            return [code, { 'Content-Type': 'application/json' }, JSON.stringify({
                errors: [{
                    errorType: error,
                    message: 'Error: ' + error
                }]
            })];
        }, delay);
    };

    (0, _emberMocha.describeComponent)('gh-file-uploader', 'Integration: Component: gh-file-uploader', {
        integration: true
    }, function () {
        var server = undefined;

        beforeEach(function () {
            server = new _pretender['default']();
            this.set('uploadUrl', '/ghost/api/v0.1/uploads/');
        });

        afterEach(function () {
            server.shutdown();
        });

        (0, _emberMocha.it)('renders', function () {
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 20
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['content', 'gh-file-uploader', ['loc', [null, [1, 0], [1, 20]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            (0, _chai.expect)(this.$('label').text().trim(), 'default label').to.equal('Select or drag-and-drop a file');
        });

        (0, _emberMocha.it)('renders form with supplied label text', function () {
            this.set('labelText', 'My label');
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 40
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-file-uploader', [], ['labelText', ['subexpr', '@mut', [['get', 'labelText', ['loc', [null, [1, 29], [1, 38]]]]], [], []]], ['loc', [null, [1, 0], [1, 40]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            (0, _chai.expect)(this.$('label').text().trim(), 'label').to.equal('My label');
        });

        (0, _emberMocha.it)('generates request to supplied endpoint', function (done) {
            stubSuccessfulUpload(server);

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 34
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-file-uploader', [], ['url', ['subexpr', '@mut', [['get', 'uploadUrl', ['loc', [null, [1, 23], [1, 32]]]]], [], []]], ['loc', [null, [1, 0], [1, 34]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

            (0, _emberTestHelpersWait['default'])().then(function () {
                (0, _chai.expect)(server.handledRequests.length).to.equal(1);
                (0, _chai.expect)(server.handledRequests[0].url).to.equal('/ghost/api/v0.1/uploads/');
                done();
            });
        });

        (0, _emberMocha.it)('fires uploadSuccess action on successful upload', function (done) {
            var uploadSuccess = _sinon['default'].spy();
            this.set('uploadSuccess', uploadSuccess);

            stubSuccessfulUpload(server);

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 71
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-file-uploader', [], ['url', ['subexpr', '@mut', [['get', 'uploadUrl', ['loc', [null, [1, 23], [1, 32]]]]], [], []], 'uploadSuccess', ['subexpr', 'action', [['get', 'uploadSuccess', ['loc', [null, [1, 55], [1, 68]]]]], [], ['loc', [null, [1, 47], [1, 69]]]]], ['loc', [null, [1, 0], [1, 71]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

            (0, _emberTestHelpersWait['default'])().then(function () {
                (0, _chai.expect)(uploadSuccess.calledOnce).to.be['true'];
                (0, _chai.expect)(uploadSuccess.firstCall.args[0]).to.equal('/content/images/test.png');
                done();
            });
        });

        (0, _emberMocha.it)('doesn\'t fire uploadSuccess action on failed upload', function (done) {
            var uploadSuccess = _sinon['default'].spy();
            this.set('uploadSuccess', uploadSuccess);

            stubFailedUpload(server, 500);

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 71
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-file-uploader', [], ['url', ['subexpr', '@mut', [['get', 'uploadUrl', ['loc', [null, [1, 23], [1, 32]]]]], [], []], 'uploadSuccess', ['subexpr', 'action', [['get', 'uploadSuccess', ['loc', [null, [1, 55], [1, 68]]]]], [], ['loc', [null, [1, 47], [1, 69]]]]], ['loc', [null, [1, 0], [1, 71]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

            (0, _emberTestHelpersWait['default'])().then(function () {
                (0, _chai.expect)(uploadSuccess.calledOnce).to.be['false'];
                done();
            });
        });

        (0, _emberMocha.it)('fires uploadStarted action on upload start', function (done) {
            var uploadStarted = _sinon['default'].spy();
            this.set('uploadStarted', uploadStarted);

            stubSuccessfulUpload(server);

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 71
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-file-uploader', [], ['url', ['subexpr', '@mut', [['get', 'uploadUrl', ['loc', [null, [1, 23], [1, 32]]]]], [], []], 'uploadStarted', ['subexpr', 'action', [['get', 'uploadStarted', ['loc', [null, [1, 55], [1, 68]]]]], [], ['loc', [null, [1, 47], [1, 69]]]]], ['loc', [null, [1, 0], [1, 71]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

            (0, _emberTestHelpersWait['default'])().then(function () {
                (0, _chai.expect)(uploadStarted.calledOnce).to.be['true'];
                done();
            });
        });

        (0, _emberMocha.it)('fires uploadFinished action on successful upload', function (done) {
            var uploadFinished = _sinon['default'].spy();
            this.set('uploadFinished', uploadFinished);

            stubSuccessfulUpload(server);

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 73
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-file-uploader', [], ['url', ['subexpr', '@mut', [['get', 'uploadUrl', ['loc', [null, [1, 23], [1, 32]]]]], [], []], 'uploadFinished', ['subexpr', 'action', [['get', 'uploadFinished', ['loc', [null, [1, 56], [1, 70]]]]], [], ['loc', [null, [1, 48], [1, 71]]]]], ['loc', [null, [1, 0], [1, 73]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

            (0, _emberTestHelpersWait['default'])().then(function () {
                (0, _chai.expect)(uploadFinished.calledOnce).to.be['true'];
                done();
            });
        });

        (0, _emberMocha.it)('fires uploadFinished action on failed upload', function (done) {
            var uploadFinished = _sinon['default'].spy();
            this.set('uploadFinished', uploadFinished);

            stubFailedUpload(server);

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 73
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-file-uploader', [], ['url', ['subexpr', '@mut', [['get', 'uploadUrl', ['loc', [null, [1, 23], [1, 32]]]]], [], []], 'uploadFinished', ['subexpr', 'action', [['get', 'uploadFinished', ['loc', [null, [1, 56], [1, 70]]]]], [], ['loc', [null, [1, 48], [1, 71]]]]], ['loc', [null, [1, 0], [1, 73]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

            (0, _emberTestHelpersWait['default'])().then(function () {
                (0, _chai.expect)(uploadFinished.calledOnce).to.be['true'];
                done();
            });
        });

        (0, _emberMocha.it)('displays invalid file type error', function (done) {
            var _this = this;

            stubFailedUpload(server, 415, 'UnsupportedMediaTypeError');
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 34
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-file-uploader', [], ['url', ['subexpr', '@mut', [['get', 'uploadUrl', ['loc', [null, [1, 23], [1, 32]]]]], [], []]], ['loc', [null, [1, 0], [1, 34]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

            (0, _emberTestHelpersWait['default'])().then(function () {
                (0, _chai.expect)(_this.$('.failed').length, 'error message is displayed').to.equal(1);
                (0, _chai.expect)(_this.$('.failed').text()).to.match(/The file type you uploaded is not supported/);
                (0, _chai.expect)(_this.$('.btn-green').length, 'reset button is displayed').to.equal(1);
                (0, _chai.expect)(_this.$('.btn-green').text()).to.equal('Try Again');
                done();
            });
        });

        (0, _emberMocha.it)('displays file too large for server error', function (done) {
            var _this2 = this;

            stubFailedUpload(server, 413, 'RequestEntityTooLargeError');
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 34
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-file-uploader', [], ['url', ['subexpr', '@mut', [['get', 'uploadUrl', ['loc', [null, [1, 23], [1, 32]]]]], [], []]], ['loc', [null, [1, 0], [1, 34]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

            (0, _emberTestHelpersWait['default'])().then(function () {
                (0, _chai.expect)(_this2.$('.failed').length, 'error message is displayed').to.equal(1);
                (0, _chai.expect)(_this2.$('.failed').text()).to.match(/The file you uploaded was larger/);
                done();
            });
        });

        (0, _emberMocha.it)('handles file too large error directly from the web server', function (done) {
            var _this3 = this;

            server.post('/ghost/api/v0.1/uploads/', function () {
                return [413, {}, ''];
            });
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 34
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-file-uploader', [], ['url', ['subexpr', '@mut', [['get', 'uploadUrl', ['loc', [null, [1, 23], [1, 32]]]]], [], []]], ['loc', [null, [1, 0], [1, 34]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

            (0, _emberTestHelpersWait['default'])().then(function () {
                (0, _chai.expect)(_this3.$('.failed').length, 'error message is displayed').to.equal(1);
                (0, _chai.expect)(_this3.$('.failed').text()).to.match(/The file you uploaded was larger/);
                done();
            });
        });

        (0, _emberMocha.it)('displays other server-side error with message', function (done) {
            var _this4 = this;

            stubFailedUpload(server, 400, 'UnknownError');
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 34
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-file-uploader', [], ['url', ['subexpr', '@mut', [['get', 'uploadUrl', ['loc', [null, [1, 23], [1, 32]]]]], [], []]], ['loc', [null, [1, 0], [1, 34]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

            (0, _emberTestHelpersWait['default'])().then(function () {
                (0, _chai.expect)(_this4.$('.failed').length, 'error message is displayed').to.equal(1);
                (0, _chai.expect)(_this4.$('.failed').text()).to.match(/Error: UnknownError/);
                done();
            });
        });

        (0, _emberMocha.it)('handles unknown failure', function (done) {
            var _this5 = this;

            server.post('/ghost/api/v0.1/uploads/', function () {
                return [500, { 'Content-Type': 'application/json' }, ''];
            });
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 34
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-file-uploader', [], ['url', ['subexpr', '@mut', [['get', 'uploadUrl', ['loc', [null, [1, 23], [1, 32]]]]], [], []]], ['loc', [null, [1, 0], [1, 34]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

            (0, _emberTestHelpersWait['default'])().then(function () {
                (0, _chai.expect)(_this5.$('.failed').length, 'error message is displayed').to.equal(1);
                (0, _chai.expect)(_this5.$('.failed').text()).to.match(/Something went wrong/);
                done();
            });
        });

        (0, _emberMocha.it)('can be reset after a failed upload', function (done) {
            var _this6 = this;

            stubFailedUpload(server, 400, 'UnknownError');
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 34
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-file-uploader', [], ['url', ['subexpr', '@mut', [['get', 'uploadUrl', ['loc', [null, [1, 23], [1, 32]]]]], [], []]], ['loc', [null, [1, 0], [1, 34]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

            (0, _emberTestHelpersWait['default'])().then(function () {
                run(function () {
                    _this6.$('.btn-green').click();
                });
            });

            (0, _emberTestHelpersWait['default'])().then(function () {
                (0, _chai.expect)(_this6.$('input[type="file"]').length).to.equal(1);
                done();
            });
        });

        (0, _emberMocha.it)('displays upload progress', function (done) {
            this.set('done', done);

            // pretender fires a progress event every 50ms
            stubSuccessfulUpload(server, 150);

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 63
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-file-uploader', [], ['url', ['subexpr', '@mut', [['get', 'uploadUrl', ['loc', [null, [1, 23], [1, 32]]]]], [], []], 'uploadFinished', ['subexpr', 'action', [['get', 'done', ['loc', [null, [1, 56], [1, 60]]]]], [], ['loc', [null, [1, 48], [1, 61]]]]], ['loc', [null, [1, 0], [1, 63]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

            // after 75ms we should have had one progress event
            run.later(this, function () {
                (0, _chai.expect)(this.$('.progress .bar').length).to.equal(1);

                var _$$attr$match = this.$('.progress .bar').attr('style').match(/width: (\d+)%?/);

                var _$$attr$match2 = _slicedToArray(_$$attr$match, 2);

                var _ = _$$attr$match2[0];
                var percentageWidth = _$$attr$match2[1];

                (0, _chai.expect)(percentageWidth).to.be.above(0);
                (0, _chai.expect)(percentageWidth).to.be.below(100);
            }, 75);
        });

        (0, _emberMocha.it)('handles drag over/leave', function () {
            var _this7 = this;

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 20
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['content', 'gh-file-uploader', ['loc', [null, [1, 0], [1, 20]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            run(function () {
                var dragover = _ember['default'].$.Event('dragover', {
                    dataTransfer: {
                        files: []
                    }
                });
                _this7.$('.gh-image-uploader').trigger(dragover);
            });

            (0, _chai.expect)(this.$('.gh-image-uploader').hasClass('--drag-over'), 'has drag-over class').to.be['true'];

            run(function () {
                _this7.$('.gh-image-uploader').trigger('dragleave');
            });

            (0, _chai.expect)(this.$('.gh-image-uploader').hasClass('--drag-over'), 'has drag-over class').to.be['false'];
        });

        (0, _emberMocha.it)('triggers file upload on file drop', function (done) {
            var _this8 = this;

            var uploadSuccess = _sinon['default'].spy();
            var drop = _ember['default'].$.Event('drop', {
                dataTransfer: {
                    files: [(0, _ghostAdminTestsHelpersFileUpload.createFile)()]
                }
            });

            this.set('uploadSuccess', uploadSuccess);

            stubSuccessfulUpload(server);
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 71
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-file-uploader', [], ['url', ['subexpr', '@mut', [['get', 'uploadUrl', ['loc', [null, [1, 23], [1, 32]]]]], [], []], 'uploadSuccess', ['subexpr', 'action', [['get', 'uploadSuccess', ['loc', [null, [1, 55], [1, 68]]]]], [], ['loc', [null, [1, 47], [1, 69]]]]], ['loc', [null, [1, 0], [1, 71]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            run(function () {
                _this8.$('.gh-image-uploader').trigger(drop);
            });

            (0, _emberTestHelpersWait['default'])().then(function () {
                (0, _chai.expect)(uploadSuccess.calledOnce).to.be['true'];
                (0, _chai.expect)(uploadSuccess.firstCall.args[0]).to.equal('/content/images/test.png');
                done();
            });
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/components/gh-image-uploader-test', ['exports', 'ember', 'sinon', 'chai', 'ember-mocha', 'pretender', 'ember-test-helpers/wait', 'ghost-admin/tests/helpers/file-upload'], function (exports, _ember, _sinon, _chai, _emberMocha, _pretender, _emberTestHelpersWait, _ghostAdminTestsHelpersFileUpload) {
    var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

    var run = _ember['default'].run;

    var keyCodes = {
        enter: 13
    };

    var configStub = _ember['default'].Service.extend({
        fileStorage: true
    });

    var sessionStub = _ember['default'].Service.extend({
        isAuthenticated: false,
        authorize: function authorize(authorizer, block) {
            if (this.get('isAuthenticated')) {
                block('Authorization', 'Bearer token');
            }
        }
    });

    var stubSuccessfulUpload = function stubSuccessfulUpload(server) {
        var delay = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

        server.post('/ghost/api/v0.1/uploads/', function () {
            return [200, { 'Content-Type': 'application/json' }, '"/content/images/test.png"'];
        }, delay);
    };

    var stubFailedUpload = function stubFailedUpload(server, code, error) {
        var delay = arguments.length <= 3 || arguments[3] === undefined ? 0 : arguments[3];

        server.post('/ghost/api/v0.1/uploads/', function () {
            return [code, { 'Content-Type': 'application/json' }, JSON.stringify({
                errors: [{
                    errorType: error,
                    message: 'Error: ' + error
                }]
            })];
        }, delay);
    };

    (0, _emberMocha.describeComponent)('gh-image-upload', 'Integration: Component: gh-image-uploader', {
        integration: true
    }, function () {
        var server = undefined;

        beforeEach(function () {
            this.register('service:config', configStub);
            this.register('service:session', sessionStub);
            this.inject.service('config', { as: 'configService' });
            this.inject.service('session', { as: 'sessionService' });
            this.set('update', function () {});
            server = new _pretender['default']();
        });

        afterEach(function () {
            server.shutdown();
        });

        (0, _emberMocha.it)('renders', function () {
            this.set('image', 'http://example.com/test.png');
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 33
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []]], ['loc', [null, [1, 0], [1, 33]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _chai.expect)(this.$()).to.have.length(1);
        });

        (0, _emberMocha.it)('defaults to upload form', function () {
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 33
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []]], ['loc', [null, [1, 0], [1, 33]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _chai.expect)(this.$('input[type="file"]').length).to.equal(1);
        });

        (0, _emberMocha.it)('defaults to url form with no filestorage config', function () {
            this.set('configService.fileStorage', false);
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 33
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []]], ['loc', [null, [1, 0], [1, 33]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _chai.expect)(this.$('input[type="file"]').length).to.equal(0);
            (0, _chai.expect)(this.$('input[type="text"].url').length).to.equal(1);
        });

        (0, _emberMocha.it)('can switch between form types', function () {
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 33
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []]], ['loc', [null, [1, 0], [1, 33]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _chai.expect)(this.$('input[type="file"]').length).to.equal(1);
            (0, _chai.expect)(this.$('input[type="text"].url').length).to.equal(0);

            this.$('a.image-url').click();

            (0, _chai.expect)(this.$('input[type="file"]').length, 'upload form is visible after switch to url form').to.equal(0);
            (0, _chai.expect)(this.$('input[type="text"].url').length, 'url form is visible after switch to url form').to.equal(1);

            this.$('a.image-upload').click();

            (0, _chai.expect)(this.$('input[type="file"]').length, 'upload form is visible after switch to upload form').to.equal(1);
            (0, _chai.expect)(this.$('input[type="text"].url').length, 'url form is visible after switch to upload form').to.equal(0);
        });

        (0, _emberMocha.it)('triggers formChanged action when switching between forms', function () {
            var formChanged = _sinon['default'].spy();
            this.set('formChanged', formChanged);

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 66
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'formChanged', ['subexpr', 'action', [['get', 'formChanged', ['loc', [null, [1, 52], [1, 63]]]]], [], ['loc', [null, [1, 44], [1, 64]]]]], ['loc', [null, [1, 0], [1, 66]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            this.$('a.image-url').click();
            this.$('a.image-upload').click();

            (0, _chai.expect)(formChanged.calledTwice).to.be['true'];
            (0, _chai.expect)(formChanged.firstCall.args[0]).to.equal('url-input');
            (0, _chai.expect)(formChanged.secondCall.args[0]).to.equal('upload');
        });

        describe('file upload form', function () {
            (0, _emberMocha.it)('renders form with supplied text', function () {
                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 50
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'text', 'text test'], ['loc', [null, [1, 0], [1, 50]]]]],
                        locals: [],
                        templates: []
                    };
                })()));
                (0, _chai.expect)(this.$('.description').text().trim()).to.equal('text test');
            });

            (0, _emberMocha.it)('generates request to correct endpoint', function (done) {
                stubSuccessfulUpload(server);

                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 56
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'update', ['subexpr', 'action', [['get', 'update', ['loc', [null, [1, 47], [1, 53]]]]], [], ['loc', [null, [1, 39], [1, 54]]]]], ['loc', [null, [1, 0], [1, 56]]]]],
                        locals: [],
                        templates: []
                    };
                })()));
                (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

                (0, _emberTestHelpersWait['default'])().then(function () {
                    (0, _chai.expect)(server.handledRequests.length).to.equal(1);
                    (0, _chai.expect)(server.handledRequests[0].url).to.equal('/ghost/api/v0.1/uploads/');
                    (0, _chai.expect)(server.handledRequests[0].requestHeaders.Authorization).to.be.undefined;
                    done();
                });
            });

            (0, _emberMocha.it)('adds authentication headers to request', function (done) {
                stubSuccessfulUpload(server);

                this.get('sessionService').set('isAuthenticated', true);

                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 56
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'update', ['subexpr', 'action', [['get', 'update', ['loc', [null, [1, 47], [1, 53]]]]], [], ['loc', [null, [1, 39], [1, 54]]]]], ['loc', [null, [1, 0], [1, 56]]]]],
                        locals: [],
                        templates: []
                    };
                })()));
                (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

                (0, _emberTestHelpersWait['default'])().then(function () {
                    var _server$handledRequests = _slicedToArray(server.handledRequests, 1);

                    var request = _server$handledRequests[0];

                    (0, _chai.expect)(request.requestHeaders.Authorization).to.equal('Bearer token');
                    done();
                });
            });

            (0, _emberMocha.it)('fires update action on successful upload', function (done) {
                var update = _sinon['default'].spy();
                this.set('update', update);

                stubSuccessfulUpload(server);

                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 56
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'update', ['subexpr', 'action', [['get', 'update', ['loc', [null, [1, 47], [1, 53]]]]], [], ['loc', [null, [1, 39], [1, 54]]]]], ['loc', [null, [1, 0], [1, 56]]]]],
                        locals: [],
                        templates: []
                    };
                })()));
                (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

                (0, _emberTestHelpersWait['default'])().then(function () {
                    (0, _chai.expect)(update.calledOnce).to.be['true'];
                    (0, _chai.expect)(update.firstCall.args[0]).to.equal('/content/images/test.png');
                    done();
                });
            });

            (0, _emberMocha.it)('doesn\'t fire update action on failed upload', function (done) {
                var update = _sinon['default'].spy();
                this.set('update', update);

                stubFailedUpload(server, 500);

                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 56
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'update', ['subexpr', 'action', [['get', 'update', ['loc', [null, [1, 47], [1, 53]]]]], [], ['loc', [null, [1, 39], [1, 54]]]]], ['loc', [null, [1, 0], [1, 56]]]]],
                        locals: [],
                        templates: []
                    };
                })()));
                (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

                (0, _emberTestHelpersWait['default'])().then(function () {
                    (0, _chai.expect)(update.calledOnce).to.be['false'];
                    done();
                });
            });

            (0, _emberMocha.it)('fires uploadStarted action on upload start', function (done) {
                var uploadStarted = _sinon['default'].spy();
                this.set('uploadStarted', uploadStarted);

                stubSuccessfulUpload(server);

                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 93
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'uploadStarted', ['subexpr', 'action', [['get', 'uploadStarted', ['loc', [null, [1, 54], [1, 67]]]]], [], ['loc', [null, [1, 46], [1, 68]]]], 'update', ['subexpr', 'action', [['get', 'update', ['loc', [null, [1, 84], [1, 90]]]]], [], ['loc', [null, [1, 76], [1, 91]]]]], ['loc', [null, [1, 0], [1, 93]]]]],
                        locals: [],
                        templates: []
                    };
                })()));
                (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

                (0, _emberTestHelpersWait['default'])().then(function () {
                    (0, _chai.expect)(uploadStarted.calledOnce).to.be['true'];
                    done();
                });
            });

            (0, _emberMocha.it)('fires uploadFinished action on successful upload', function (done) {
                var uploadFinished = _sinon['default'].spy();
                this.set('uploadFinished', uploadFinished);

                stubSuccessfulUpload(server);

                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 95
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'uploadFinished', ['subexpr', 'action', [['get', 'uploadFinished', ['loc', [null, [1, 55], [1, 69]]]]], [], ['loc', [null, [1, 47], [1, 70]]]], 'update', ['subexpr', 'action', [['get', 'update', ['loc', [null, [1, 86], [1, 92]]]]], [], ['loc', [null, [1, 78], [1, 93]]]]], ['loc', [null, [1, 0], [1, 95]]]]],
                        locals: [],
                        templates: []
                    };
                })()));
                (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

                (0, _emberTestHelpersWait['default'])().then(function () {
                    (0, _chai.expect)(uploadFinished.calledOnce).to.be['true'];
                    done();
                });
            });

            (0, _emberMocha.it)('fires uploadFinished action on failed upload', function (done) {
                var uploadFinished = _sinon['default'].spy();
                this.set('uploadFinished', uploadFinished);

                stubFailedUpload(server);

                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 95
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'uploadFinished', ['subexpr', 'action', [['get', 'uploadFinished', ['loc', [null, [1, 55], [1, 69]]]]], [], ['loc', [null, [1, 47], [1, 70]]]], 'update', ['subexpr', 'action', [['get', 'update', ['loc', [null, [1, 86], [1, 92]]]]], [], ['loc', [null, [1, 78], [1, 93]]]]], ['loc', [null, [1, 0], [1, 95]]]]],
                        locals: [],
                        templates: []
                    };
                })()));
                (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

                (0, _emberTestHelpersWait['default'])().then(function () {
                    (0, _chai.expect)(uploadFinished.calledOnce).to.be['true'];
                    done();
                });
            });

            (0, _emberMocha.it)('displays invalid file type error', function (done) {
                var _this = this;

                stubFailedUpload(server, 415, 'UnsupportedMediaTypeError');
                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 56
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'update', ['subexpr', 'action', [['get', 'update', ['loc', [null, [1, 47], [1, 53]]]]], [], ['loc', [null, [1, 39], [1, 54]]]]], ['loc', [null, [1, 0], [1, 56]]]]],
                        locals: [],
                        templates: []
                    };
                })()));
                (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

                (0, _emberTestHelpersWait['default'])().then(function () {
                    (0, _chai.expect)(_this.$('.failed').length, 'error message is displayed').to.equal(1);
                    (0, _chai.expect)(_this.$('.failed').text()).to.match(/The image type you uploaded is not supported/);
                    (0, _chai.expect)(_this.$('.btn-green').length, 'reset button is displayed').to.equal(1);
                    (0, _chai.expect)(_this.$('.btn-green').text()).to.equal('Try Again');
                    done();
                });
            });

            (0, _emberMocha.it)('displays file too large for server error', function (done) {
                var _this2 = this;

                stubFailedUpload(server, 413, 'RequestEntityTooLargeError');
                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 56
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'update', ['subexpr', 'action', [['get', 'update', ['loc', [null, [1, 47], [1, 53]]]]], [], ['loc', [null, [1, 39], [1, 54]]]]], ['loc', [null, [1, 0], [1, 56]]]]],
                        locals: [],
                        templates: []
                    };
                })()));
                (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

                (0, _emberTestHelpersWait['default'])().then(function () {
                    (0, _chai.expect)(_this2.$('.failed').length, 'error message is displayed').to.equal(1);
                    (0, _chai.expect)(_this2.$('.failed').text()).to.match(/The image you uploaded was larger/);
                    done();
                });
            });

            (0, _emberMocha.it)('handles file too large error directly from the web server', function (done) {
                var _this3 = this;

                server.post('/ghost/api/v0.1/uploads/', function () {
                    return [413, {}, ''];
                });
                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 56
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'update', ['subexpr', 'action', [['get', 'update', ['loc', [null, [1, 47], [1, 53]]]]], [], ['loc', [null, [1, 39], [1, 54]]]]], ['loc', [null, [1, 0], [1, 56]]]]],
                        locals: [],
                        templates: []
                    };
                })()));
                (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

                (0, _emberTestHelpersWait['default'])().then(function () {
                    (0, _chai.expect)(_this3.$('.failed').length, 'error message is displayed').to.equal(1);
                    (0, _chai.expect)(_this3.$('.failed').text()).to.match(/The image you uploaded was larger/);
                    done();
                });
            });

            (0, _emberMocha.it)('displays other server-side error with message', function (done) {
                var _this4 = this;

                stubFailedUpload(server, 400, 'UnknownError');
                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 56
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'update', ['subexpr', 'action', [['get', 'update', ['loc', [null, [1, 47], [1, 53]]]]], [], ['loc', [null, [1, 39], [1, 54]]]]], ['loc', [null, [1, 0], [1, 56]]]]],
                        locals: [],
                        templates: []
                    };
                })()));
                (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

                (0, _emberTestHelpersWait['default'])().then(function () {
                    (0, _chai.expect)(_this4.$('.failed').length, 'error message is displayed').to.equal(1);
                    (0, _chai.expect)(_this4.$('.failed').text()).to.match(/Error: UnknownError/);
                    done();
                });
            });

            (0, _emberMocha.it)('handles unknown failure', function (done) {
                var _this5 = this;

                server.post('/ghost/api/v0.1/uploads/', function () {
                    return [500, { 'Content-Type': 'application/json' }, ''];
                });
                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 56
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'update', ['subexpr', 'action', [['get', 'update', ['loc', [null, [1, 47], [1, 53]]]]], [], ['loc', [null, [1, 39], [1, 54]]]]], ['loc', [null, [1, 0], [1, 56]]]]],
                        locals: [],
                        templates: []
                    };
                })()));
                (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

                (0, _emberTestHelpersWait['default'])().then(function () {
                    (0, _chai.expect)(_this5.$('.failed').length, 'error message is displayed').to.equal(1);
                    (0, _chai.expect)(_this5.$('.failed').text()).to.match(/Something went wrong/);
                    done();
                });
            });

            (0, _emberMocha.it)('can be reset after a failed upload', function (done) {
                var _this6 = this;

                stubFailedUpload(server, 400, 'UnknownError');
                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 56
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'update', ['subexpr', 'action', [['get', 'update', ['loc', [null, [1, 47], [1, 53]]]]], [], ['loc', [null, [1, 39], [1, 54]]]]], ['loc', [null, [1, 0], [1, 56]]]]],
                        locals: [],
                        templates: []
                    };
                })()));
                (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

                (0, _emberTestHelpersWait['default'])().then(function () {
                    run(function () {
                        _this6.$('.btn-green').click();
                    });
                });

                (0, _emberTestHelpersWait['default'])().then(function () {
                    (0, _chai.expect)(_this6.$('input[type="file"]').length).to.equal(1);
                    done();
                });
            });

            (0, _emberMocha.it)('displays upload progress', function (done) {
                this.set('done', done);

                // pretender fires a progress event every 50ms
                stubSuccessfulUpload(server, 150);

                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 85
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'uploadFinished', ['subexpr', 'action', [['get', 'done', ['loc', [null, [1, 55], [1, 59]]]]], [], ['loc', [null, [1, 47], [1, 60]]]], 'update', ['subexpr', 'action', [['get', 'update', ['loc', [null, [1, 76], [1, 82]]]]], [], ['loc', [null, [1, 68], [1, 83]]]]], ['loc', [null, [1, 0], [1, 85]]]]],
                        locals: [],
                        templates: []
                    };
                })()));
                (0, _ghostAdminTestsHelpersFileUpload.fileUpload)(this.$('input[type="file"]'));

                // after 75ms we should have had one progress event
                run.later(this, function () {
                    (0, _chai.expect)(this.$('.progress .bar').length).to.equal(1);

                    var _$$attr$match = this.$('.progress .bar').attr('style').match(/width: (\d+)%?/);

                    var _$$attr$match2 = _slicedToArray(_$$attr$match, 2);

                    var _ = _$$attr$match2[0];
                    var percentageWidth = _$$attr$match2[1];

                    (0, _chai.expect)(percentageWidth).to.be.above(0);
                    (0, _chai.expect)(percentageWidth).to.be.below(100);
                }, 75);
            });

            (0, _emberMocha.it)('handles drag over/leave', function () {
                var _this7 = this;

                stubSuccessfulUpload(server);

                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 56
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'update', ['subexpr', 'action', [['get', 'update', ['loc', [null, [1, 47], [1, 53]]]]], [], ['loc', [null, [1, 39], [1, 54]]]]], ['loc', [null, [1, 0], [1, 56]]]]],
                        locals: [],
                        templates: []
                    };
                })()));

                run(function () {
                    var dragover = _ember['default'].$.Event('dragover', {
                        dataTransfer: {
                            files: []
                        }
                    });
                    _this7.$('.gh-image-uploader').trigger(dragover);
                });

                (0, _chai.expect)(this.$('.gh-image-uploader').hasClass('--drag-over'), 'has drag-over class').to.be['true'];

                run(function () {
                    _this7.$('.gh-image-uploader').trigger('dragleave');
                });

                (0, _chai.expect)(this.$('.gh-image-uploader').hasClass('--drag-over'), 'has drag-over class').to.be['false'];
            });

            (0, _emberMocha.it)('triggers file upload on file drop', function (done) {
                var _this8 = this;

                var uploadSuccess = _sinon['default'].spy();
                var drop = _ember['default'].$.Event('drop', {
                    dataTransfer: {
                        files: [(0, _ghostAdminTestsHelpersFileUpload.createFile)()]
                    }
                });

                this.set('uploadSuccess', uploadSuccess);

                stubSuccessfulUpload(server);
                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 58
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['uploadSuccess', ['subexpr', 'action', [['get', 'uploadSuccess', ['loc', [null, [1, 42], [1, 55]]]]], [], ['loc', [null, [1, 34], [1, 56]]]]], ['loc', [null, [1, 0], [1, 58]]]]],
                        locals: [],
                        templates: []
                    };
                })()));

                run(function () {
                    _this8.$('.gh-image-uploader').trigger(drop);
                });

                (0, _emberTestHelpersWait['default'])().then(function () {
                    (0, _chai.expect)(uploadSuccess.calledOnce).to.be['true'];
                    (0, _chai.expect)(uploadSuccess.firstCall.args[0]).to.equal('/content/images/test.png');
                    done();
                });
            });
        });

        describe('URL input form', function () {
            beforeEach(function () {
                this.set('configService.fileStorage', false);
            });

            (0, _emberMocha.it)('displays save button by default', function () {
                this.set('image', 'http://example.com/test.png');
                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 50
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'text', 'text test'], ['loc', [null, [1, 0], [1, 50]]]]],
                        locals: [],
                        templates: []
                    };
                })()));
                (0, _chai.expect)(this.$('button').length).to.equal(1);
                (0, _chai.expect)(this.$('input[type="text"]').val()).to.equal('http://example.com/test.png');
            });

            (0, _emberMocha.it)('can render without a save button', function () {
                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 67
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'saveButton', false, 'text', 'text test'], ['loc', [null, [1, 0], [1, 67]]]]],
                        locals: [],
                        templates: []
                    };
                })()));
                (0, _chai.expect)(this.$('button').length).to.equal(0);
                (0, _chai.expect)(this.$('.description').text().trim()).to.equal('text test');
            });

            (0, _emberMocha.it)('fires update action when save button clicked', function () {
                var update = _sinon['default'].spy();
                this.set('update', update);

                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 56
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'update', ['subexpr', 'action', [['get', 'update', ['loc', [null, [1, 47], [1, 53]]]]], [], ['loc', [null, [1, 39], [1, 54]]]]], ['loc', [null, [1, 0], [1, 56]]]]],
                        locals: [],
                        templates: []
                    };
                })()));

                this.$('input[type="text"]').val('saved url');
                this.$('input[type="text"]').change();
                this.$('button.btn-blue').click();

                (0, _chai.expect)(update.calledOnce).to.be['true'];
                (0, _chai.expect)(update.firstCall.args[0]).to.equal('saved url');
            });

            (0, _emberMocha.it)('fires onInput action when typing URL', function () {
                var onInput = _sinon['default'].spy();
                this.set('onInput', onInput);

                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 58
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'onInput', ['subexpr', 'action', [['get', 'onInput', ['loc', [null, [1, 48], [1, 55]]]]], [], ['loc', [null, [1, 40], [1, 56]]]]], ['loc', [null, [1, 0], [1, 58]]]]],
                        locals: [],
                        templates: []
                    };
                })()));

                this.$('input[type="text"]').val('input url');
                this.$('input[type="text"]').change();

                (0, _chai.expect)(onInput.calledOnce).to.be['true'];
                (0, _chai.expect)(onInput.firstCall.args[0]).to.equal('input url');
            });

            (0, _emberMocha.it)('saves on enter key', function () {
                var update = _sinon['default'].spy();
                this.set('update', update);

                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 56
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                            dom.insertBoundary(fragment, 0);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['inline', 'gh-image-uploader', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 26], [1, 31]]]]], [], []], 'update', ['subexpr', 'action', [['get', 'update', ['loc', [null, [1, 47], [1, 53]]]]], [], ['loc', [null, [1, 39], [1, 54]]]]], ['loc', [null, [1, 0], [1, 56]]]]],
                        locals: [],
                        templates: []
                    };
                })()));

                this.$('input[type="text"]').val('saved url');
                this.$('input[type="text"]').change();
                this.$('input[type="text"]').trigger($.Event('keyup', { keyCode: keyCodes.enter, which: keyCodes.enter }));

                (0, _chai.expect)(update.calledOnce).to.be['true'];
                (0, _chai.expect)(update.firstCall.args[0]).to.equal('saved url');
            });
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/components/gh-image-uploader-with-preview-test', ['exports', 'chai', 'ember-mocha', 'ember', 'sinon'], function (exports, _chai, _emberMocha, _ember, _sinon) {
    var run = _ember['default'].run;

    (0, _emberMocha.describeComponent)('gh-image-uploader-with-preview', 'Integration: Component: gh-image-uploader-with-preview', {
        integration: true
    }, function () {
        (0, _emberMocha.it)('renders image if provided', function () {
            this.set('image', 'http://example.com/test.png');

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 46
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-image-uploader-with-preview', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 39], [1, 44]]]]], [], []]], ['loc', [null, [1, 0], [1, 46]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            (0, _chai.expect)(this.$('.gh-image-uploader.--with-image').length).to.equal(1);
            (0, _chai.expect)(this.$('img').attr('src')).to.equal('http://example.com/test.png');
        });

        (0, _emberMocha.it)('renders upload form when no image provided', function () {
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 46
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-image-uploader-with-preview', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 39], [1, 44]]]]], [], []]], ['loc', [null, [1, 0], [1, 46]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            (0, _chai.expect)(this.$('input[type="file"]').length).to.equal(1);
        });

        (0, _emberMocha.it)('triggers remove action when delete icon is clicked', function () {
            var _this = this;

            var remove = _sinon['default'].spy();
            this.set('remove', remove);
            this.set('image', 'http://example.com/test.png');

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 60
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-image-uploader-with-preview', [], ['image', ['subexpr', '@mut', [['get', 'image', ['loc', [null, [1, 39], [1, 44]]]]], [], []], 'remove', ['subexpr', '@mut', [['get', 'remove', ['loc', [null, [1, 52], [1, 58]]]]], [], []]], ['loc', [null, [1, 0], [1, 60]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            run(function () {
                _this.$('.icon-trash').click();
            });

            (0, _chai.expect)(remove.calledOnce).to.be['true'];
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/components/gh-navigation-test', ['exports', 'chai', 'ember-mocha', 'ember', 'ghost-admin/models/navigation-item'], function (exports, _chai, _emberMocha, _ember, _ghostAdminModelsNavigationItem) {
    var run = _ember['default'].run;

    (0, _emberMocha.describeComponent)('gh-navigation', 'Integration: Component: gh-navigation', {
        integration: true
    }, function () {
        (0, _emberMocha.it)('renders', function () {
            this.render(_ember['default'].HTMLBars.template((function () {
                var child0 = (function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'triple-curlies'
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 1,
                                    'column': 86
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createElement('div');
                            dom.setAttribute(el1, 'class', 'js-gh-blognav');
                            var el2 = dom.createElement('div');
                            dom.setAttribute(el2, 'class', 'gh-blognav-item');
                            dom.appendChild(el1, el2);
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes() {
                            return [];
                        },
                        statements: [],
                        locals: [],
                        templates: []
                    };
                })();

                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 104
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['block', 'gh-navigation', [], [], 0, null, ['loc', [null, [1, 0], [1, 104]]]]],
                    locals: [],
                    templates: [child0]
                };
            })()));
            (0, _chai.expect)(this.$('section.gh-view')).to.have.length(1);
            (0, _chai.expect)(this.$('.ui-sortable')).to.have.length(1);
        });

        (0, _emberMocha.it)('triggers reorder action', function () {
            var _this = this;

            var navItems = [];
            var expectedOldIndex = -1;
            var expectedNewIndex = -1;

            navItems.pushObject(_ghostAdminModelsNavigationItem['default'].create({ label: 'First', url: '/first' }));
            navItems.pushObject(_ghostAdminModelsNavigationItem['default'].create({ label: 'Second', url: '/second' }));
            navItems.pushObject(_ghostAdminModelsNavigationItem['default'].create({ label: 'Third', url: '/third' }));
            navItems.pushObject(_ghostAdminModelsNavigationItem['default'].create({ label: '', url: '', last: true }));
            this.set('navigationItems', navItems);
            this.set('blogUrl', 'http://localhost:2368');

            this.on('moveItem', function (oldIndex, newIndex) {
                (0, _chai.expect)(oldIndex).to.equal(expectedOldIndex);
                (0, _chai.expect)(newIndex).to.equal(expectedNewIndex);
            });

            run(function () {
                _this.render(_ember['default'].HTMLBars.template((function () {
                    var child0 = (function () {
                        var child0 = (function () {
                            return {
                                meta: {
                                    'fragmentReason': false,
                                    'revision': 'Ember@2.5.1',
                                    'loc': {
                                        'source': null,
                                        'start': {
                                            'line': 4,
                                            'column': 24
                                        },
                                        'end': {
                                            'line': 6,
                                            'column': 24
                                        }
                                    }
                                },
                                isEmpty: false,
                                arity: 1,
                                cachedFragment: null,
                                hasRendered: false,
                                buildFragment: function buildFragment(dom) {
                                    var el0 = dom.createDocumentFragment();
                                    var el1 = dom.createTextNode('                            ');
                                    dom.appendChild(el0, el1);
                                    var el1 = dom.createComment('');
                                    dom.appendChild(el0, el1);
                                    var el1 = dom.createTextNode('\n');
                                    dom.appendChild(el0, el1);
                                    return el0;
                                },
                                buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                                    var morphs = new Array(1);
                                    morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                                    return morphs;
                                },
                                statements: [['inline', 'gh-navitem', [], ['navItem', ['subexpr', '@mut', [['get', 'navItem', ['loc', [null, [5, 49], [5, 56]]]]], [], []], 'baseUrl', ['subexpr', '@mut', [['get', 'blogUrl', ['loc', [null, [5, 65], [5, 72]]]]], [], []], 'addItem', 'addItem', 'deleteItem', 'deleteItem', 'updateUrl', 'updateUrl'], ['loc', [null, [5, 28], [5, 138]]]]],
                                locals: ['navItem'],
                                templates: []
                            };
                        })();

                        return {
                            meta: {
                                'fragmentReason': false,
                                'revision': 'Ember@2.5.1',
                                'loc': {
                                    'source': null,
                                    'start': {
                                        'line': 2,
                                        'column': 16
                                    },
                                    'end': {
                                        'line': 8,
                                        'column': 16
                                    }
                                }
                            },
                            isEmpty: false,
                            arity: 0,
                            cachedFragment: null,
                            hasRendered: false,
                            buildFragment: function buildFragment(dom) {
                                var el0 = dom.createDocumentFragment();
                                var el1 = dom.createTextNode('                    ');
                                dom.appendChild(el0, el1);
                                var el1 = dom.createElement('form');
                                dom.setAttribute(el1, 'id', 'settings-navigation');
                                dom.setAttribute(el1, 'class', 'gh-blognav js-gh-blognav');
                                dom.setAttribute(el1, 'novalidate', 'novalidate');
                                var el2 = dom.createTextNode('\n');
                                dom.appendChild(el1, el2);
                                var el2 = dom.createComment('');
                                dom.appendChild(el1, el2);
                                var el2 = dom.createTextNode('                    ');
                                dom.appendChild(el1, el2);
                                dom.appendChild(el0, el1);
                                var el1 = dom.createTextNode('\n');
                                dom.appendChild(el0, el1);
                                return el0;
                            },
                            buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                                var morphs = new Array(1);
                                morphs[0] = dom.createMorphAt(dom.childAt(fragment, [1]), 1, 1);
                                return morphs;
                            },
                            statements: [['block', 'each', [['get', 'navigationItems', ['loc', [null, [4, 32], [4, 47]]]]], [], 0, null, ['loc', [null, [4, 24], [6, 33]]]]],
                            locals: [],
                            templates: [child0]
                        };
                    })();

                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 8,
                                    'column': 34
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createTextNode('\n');
                            dom.appendChild(el0, el1);
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                            dom.insertBoundary(fragment, null);
                            return morphs;
                        },
                        statements: [['block', 'gh-navigation', [], ['moveItem', 'moveItem'], 0, null, ['loc', [null, [2, 16], [8, 34]]]]],
                        locals: [],
                        templates: [child0]
                    };
                })()));
            });

            // check it renders the nav item rows
            (0, _chai.expect)(this.$('.gh-blognav-item')).to.have.length(4);

            // move second item up one
            expectedOldIndex = 1;
            expectedNewIndex = 0;
            run(function () {
                _ember['default'].$(_this.$('.gh-blognav-item')[1]).simulateDragSortable({
                    move: -1,
                    handle: '.gh-blognav-grab'
                });
            });

            // move second item down one
            expectedOldIndex = 1;
            expectedNewIndex = 2;
            run(function () {
                _ember['default'].$(_this.$('.gh-blognav-item')[1]).simulateDragSortable({
                    move: 1,
                    handle: '.gh-blognav-grab'
                });
            });
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/components/gh-navitem-test', ['exports', 'chai', 'ember-mocha', 'ember', 'ghost-admin/models/navigation-item'], function (exports, _chai, _emberMocha, _ember, _ghostAdminModelsNavigationItem) {
    var run = _ember['default'].run;

    (0, _emberMocha.describeComponent)('gh-navitem', 'Integration: Component: gh-navitem', {
        integration: true
    }, function () {
        beforeEach(function () {
            this.set('baseUrl', 'http://localhost:2368');
        });

        (0, _emberMocha.it)('renders', function () {
            this.set('navItem', _ghostAdminModelsNavigationItem['default'].create({ label: 'Test', url: '/url' }));

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 46
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem', [], ['navItem', ['subexpr', '@mut', [['get', 'navItem', ['loc', [null, [1, 21], [1, 28]]]]], [], []], 'baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [1, 37], [1, 44]]]]], [], []]], ['loc', [null, [1, 0], [1, 46]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $item = this.$('.gh-blognav-item');

            (0, _chai.expect)($item.find('.gh-blognav-grab').length).to.equal(1);
            (0, _chai.expect)($item.find('.gh-blognav-label').length).to.equal(1);
            (0, _chai.expect)($item.find('.gh-blognav-url').length).to.equal(1);
            (0, _chai.expect)($item.find('.gh-blognav-delete').length).to.equal(1);

            // doesn't show any errors
            (0, _chai.expect)($item.hasClass('gh-blognav-item--error')).to.be['false'];
            (0, _chai.expect)($item.find('.error').length).to.equal(0);
            (0, _chai.expect)($item.find('.response:visible').length).to.equal(0);
        });

        (0, _emberMocha.it)('doesn\'t show drag handle for new items', function () {
            this.set('navItem', _ghostAdminModelsNavigationItem['default'].create({ label: 'Test', url: '/url', isNew: true }));

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 46
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem', [], ['navItem', ['subexpr', '@mut', [['get', 'navItem', ['loc', [null, [1, 21], [1, 28]]]]], [], []], 'baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [1, 37], [1, 44]]]]], [], []]], ['loc', [null, [1, 0], [1, 46]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $item = this.$('.gh-blognav-item');

            (0, _chai.expect)($item.find('.gh-blognav-grab').length).to.equal(0);
        });

        (0, _emberMocha.it)('shows add button for new items', function () {
            this.set('navItem', _ghostAdminModelsNavigationItem['default'].create({ label: 'Test', url: '/url', isNew: true }));

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 46
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem', [], ['navItem', ['subexpr', '@mut', [['get', 'navItem', ['loc', [null, [1, 21], [1, 28]]]]], [], []], 'baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [1, 37], [1, 44]]]]], [], []]], ['loc', [null, [1, 0], [1, 46]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $item = this.$('.gh-blognav-item');

            (0, _chai.expect)($item.find('.gh-blognav-add').length).to.equal(1);
            (0, _chai.expect)($item.find('.gh-blognav-delete').length).to.equal(0);
        });

        (0, _emberMocha.it)('triggers delete action', function () {
            var _this = this;

            this.set('navItem', _ghostAdminModelsNavigationItem['default'].create({ label: 'Test', url: '/url' }));

            var deleteActionCallCount = 0;
            this.on('deleteItem', function (navItem) {
                (0, _chai.expect)(navItem).to.equal(_this.get('navItem'));
                deleteActionCallCount++;
            });

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 70
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem', [], ['navItem', ['subexpr', '@mut', [['get', 'navItem', ['loc', [null, [1, 21], [1, 28]]]]], [], []], 'baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [1, 37], [1, 44]]]]], [], []], 'deleteItem', 'deleteItem'], ['loc', [null, [1, 0], [1, 70]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            this.$('.gh-blognav-delete').trigger('click');

            (0, _chai.expect)(deleteActionCallCount).to.equal(1);
        });

        (0, _emberMocha.it)('triggers add action', function () {
            this.set('navItem', _ghostAdminModelsNavigationItem['default'].create({ label: 'Test', url: '/url', isNew: true }));

            var addActionCallCount = 0;
            this.on('add', function () {
                addActionCallCount++;
            });

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 60
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem', [], ['navItem', ['subexpr', '@mut', [['get', 'navItem', ['loc', [null, [1, 21], [1, 28]]]]], [], []], 'baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [1, 37], [1, 44]]]]], [], []], 'addItem', 'add'], ['loc', [null, [1, 0], [1, 60]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            this.$('.gh-blognav-add').trigger('click');

            (0, _chai.expect)(addActionCallCount).to.equal(1);
        });

        (0, _emberMocha.it)('triggers update action', function () {
            this.set('navItem', _ghostAdminModelsNavigationItem['default'].create({ label: 'Test', url: '/url' }));

            var updateActionCallCount = 0;
            this.on('update', function () {
                updateActionCallCount++;
            });

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 65
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem', [], ['navItem', ['subexpr', '@mut', [['get', 'navItem', ['loc', [null, [1, 21], [1, 28]]]]], [], []], 'baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [1, 37], [1, 44]]]]], [], []], 'updateUrl', 'update'], ['loc', [null, [1, 0], [1, 65]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            this.$('.gh-blognav-url input').trigger('blur');

            (0, _chai.expect)(updateActionCallCount).to.equal(1);
        });

        (0, _emberMocha.it)('displays inline errors', function () {
            this.set('navItem', _ghostAdminModelsNavigationItem['default'].create({ label: '', url: '' }));
            this.get('navItem').validate();

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 46
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem', [], ['navItem', ['subexpr', '@mut', [['get', 'navItem', ['loc', [null, [1, 21], [1, 28]]]]], [], []], 'baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [1, 37], [1, 44]]]]], [], []]], ['loc', [null, [1, 0], [1, 46]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $item = this.$('.gh-blognav-item');

            (0, _chai.expect)($item.hasClass('gh-blognav-item--error')).to.be['true'];
            (0, _chai.expect)($item.find('.gh-blognav-label').hasClass('error')).to.be['true'];
            (0, _chai.expect)($item.find('.gh-blognav-label .response').text().trim()).to.equal('You must specify a label');
            (0, _chai.expect)($item.find('.gh-blognav-url').hasClass('error')).to.be['true'];
            (0, _chai.expect)($item.find('.gh-blognav-url .response').text().trim()).to.equal('You must specify a URL or relative path');
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/components/gh-navitem-url-input-test', ['exports', 'chai', 'ember-mocha', 'ember'], function (exports, _chai, _emberMocha, _ember) {
    var run = _ember['default'].run;

    // we want baseUrl to match the running domain so relative URLs are
    // handled as expected (browser auto-sets the domain when using a.href)
    var currentUrl = window.location.protocol + '//' + window.location.host + '/';

    (0, _emberMocha.describeComponent)('gh-navitem-url-input', 'Integration: Component: gh-navitem-url-input', {
        integration: true
    }, function () {
        beforeEach(function () {
            // set defaults
            this.set('baseUrl', currentUrl);
            this.set('url', '');
            this.set('isNew', false);
            this.on('clearErrors', function () {
                return null;
            });
        });

        (0, _emberMocha.it)('renders correctly with blank url', function () {
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem-url-input', [], ['baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [2, 47], [2, 54]]]]], [], []], 'url', ['subexpr', '@mut', [['get', 'url', ['loc', [null, [2, 59], [2, 62]]]]], [], []], 'isNew', ['subexpr', '@mut', [['get', 'isNew', ['loc', [null, [2, 69], [2, 74]]]]], [], []], 'change', 'updateUrl', 'clearErrors', ['subexpr', 'action', ['clearErrors'], [], ['loc', [null, [2, 106], [2, 128]]]]], ['loc', [null, [2, 16], [2, 130]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $input = this.$('input');

            (0, _chai.expect)($input).to.have.length(1);
            (0, _chai.expect)($input.hasClass('gh-input')).to.be['true'];
            (0, _chai.expect)($input.val()).to.equal(currentUrl);
        });

        (0, _emberMocha.it)('renders correctly with relative urls', function () {
            this.set('url', '/about');
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem-url-input', [], ['baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [2, 47], [2, 54]]]]], [], []], 'url', ['subexpr', '@mut', [['get', 'url', ['loc', [null, [2, 59], [2, 62]]]]], [], []], 'isNew', ['subexpr', '@mut', [['get', 'isNew', ['loc', [null, [2, 69], [2, 74]]]]], [], []], 'change', 'updateUrl', 'clearErrors', ['subexpr', 'action', ['clearErrors'], [], ['loc', [null, [2, 106], [2, 128]]]]], ['loc', [null, [2, 16], [2, 130]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $input = this.$('input');

            (0, _chai.expect)($input.val()).to.equal(currentUrl + 'about');

            this.set('url', '/about#contact');
            (0, _chai.expect)($input.val()).to.equal(currentUrl + 'about#contact');
        });

        (0, _emberMocha.it)('renders correctly with absolute urls', function () {
            this.set('url', 'https://example.com:2368/#test');
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem-url-input', [], ['baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [2, 47], [2, 54]]]]], [], []], 'url', ['subexpr', '@mut', [['get', 'url', ['loc', [null, [2, 59], [2, 62]]]]], [], []], 'isNew', ['subexpr', '@mut', [['get', 'isNew', ['loc', [null, [2, 69], [2, 74]]]]], [], []], 'change', 'updateUrl', 'clearErrors', ['subexpr', 'action', ['clearErrors'], [], ['loc', [null, [2, 106], [2, 128]]]]], ['loc', [null, [2, 16], [2, 130]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $input = this.$('input');

            (0, _chai.expect)($input.val()).to.equal('https://example.com:2368/#test');

            this.set('url', 'mailto:test@example.com');
            (0, _chai.expect)($input.val()).to.equal('mailto:test@example.com');

            this.set('url', 'tel:01234-5678-90');
            (0, _chai.expect)($input.val()).to.equal('tel:01234-5678-90');

            this.set('url', '//protocol-less-url.com');
            (0, _chai.expect)($input.val()).to.equal('//protocol-less-url.com');

            this.set('url', '#anchor');
            (0, _chai.expect)($input.val()).to.equal('#anchor');
        });

        (0, _emberMocha.it)('deletes base URL on backspace', function () {
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem-url-input', [], ['baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [2, 47], [2, 54]]]]], [], []], 'url', ['subexpr', '@mut', [['get', 'url', ['loc', [null, [2, 59], [2, 62]]]]], [], []], 'isNew', ['subexpr', '@mut', [['get', 'isNew', ['loc', [null, [2, 69], [2, 74]]]]], [], []], 'change', 'updateUrl', 'clearErrors', ['subexpr', 'action', ['clearErrors'], [], ['loc', [null, [2, 106], [2, 128]]]]], ['loc', [null, [2, 16], [2, 130]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $input = this.$('input');

            (0, _chai.expect)($input.val()).to.equal(currentUrl);
            run(function () {
                // TODO: why is ember's keyEvent helper not available here?
                var e = _ember['default'].$.Event('keydown');
                e.keyCode = 8;
                $input.trigger(e);
            });
            (0, _chai.expect)($input.val()).to.equal('');
        });

        (0, _emberMocha.it)('deletes base URL on delete', function () {
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem-url-input', [], ['baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [2, 47], [2, 54]]]]], [], []], 'url', ['subexpr', '@mut', [['get', 'url', ['loc', [null, [2, 59], [2, 62]]]]], [], []], 'isNew', ['subexpr', '@mut', [['get', 'isNew', ['loc', [null, [2, 69], [2, 74]]]]], [], []], 'change', 'updateUrl', 'clearErrors', ['subexpr', 'action', ['clearErrors'], [], ['loc', [null, [2, 106], [2, 128]]]]], ['loc', [null, [2, 16], [2, 130]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $input = this.$('input');

            (0, _chai.expect)($input.val()).to.equal(currentUrl);
            run(function () {
                // TODO: why is ember's keyEvent helper not available here?
                var e = _ember['default'].$.Event('keydown');
                e.keyCode = 46;
                $input.trigger(e);
            });
            (0, _chai.expect)($input.val()).to.equal('');
        });

        (0, _emberMocha.it)('adds base url to relative urls on blur', function () {
            this.on('updateUrl', function () {
                return null;
            });
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem-url-input', [], ['baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [2, 47], [2, 54]]]]], [], []], 'url', ['subexpr', '@mut', [['get', 'url', ['loc', [null, [2, 59], [2, 62]]]]], [], []], 'isNew', ['subexpr', '@mut', [['get', 'isNew', ['loc', [null, [2, 69], [2, 74]]]]], [], []], 'change', 'updateUrl', 'clearErrors', ['subexpr', 'action', ['clearErrors'], [], ['loc', [null, [2, 106], [2, 128]]]]], ['loc', [null, [2, 16], [2, 130]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $input = this.$('input');

            run(function () {
                $input.val('/about').trigger('input');
            });
            run(function () {
                $input.trigger('blur');
            });

            (0, _chai.expect)($input.val()).to.equal(currentUrl + 'about');
        });

        (0, _emberMocha.it)('adds "mailto:" to email addresses on blur', function () {
            this.on('updateUrl', function () {
                return null;
            });
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem-url-input', [], ['baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [2, 47], [2, 54]]]]], [], []], 'url', ['subexpr', '@mut', [['get', 'url', ['loc', [null, [2, 59], [2, 62]]]]], [], []], 'isNew', ['subexpr', '@mut', [['get', 'isNew', ['loc', [null, [2, 69], [2, 74]]]]], [], []], 'change', 'updateUrl', 'clearErrors', ['subexpr', 'action', ['clearErrors'], [], ['loc', [null, [2, 106], [2, 128]]]]], ['loc', [null, [2, 16], [2, 130]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $input = this.$('input');

            run(function () {
                $input.val('test@example.com').trigger('input');
            });
            run(function () {
                $input.trigger('blur');
            });

            (0, _chai.expect)($input.val()).to.equal('mailto:test@example.com');

            // ensure we don't double-up on the mailto:
            run(function () {
                $input.trigger('blur');
            });
            (0, _chai.expect)($input.val()).to.equal('mailto:test@example.com');
        });

        (0, _emberMocha.it)('doesn\'t add base url to invalid urls on blur', function () {
            this.on('updateUrl', function () {
                return null;
            });
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem-url-input', [], ['baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [2, 47], [2, 54]]]]], [], []], 'url', ['subexpr', '@mut', [['get', 'url', ['loc', [null, [2, 59], [2, 62]]]]], [], []], 'isNew', ['subexpr', '@mut', [['get', 'isNew', ['loc', [null, [2, 69], [2, 74]]]]], [], []], 'change', 'updateUrl', 'clearErrors', ['subexpr', 'action', ['clearErrors'], [], ['loc', [null, [2, 106], [2, 128]]]]], ['loc', [null, [2, 16], [2, 130]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $input = this.$('input');

            var changeValue = function changeValue(value) {
                run(function () {
                    $input.val(value).trigger('input').trigger('blur');
                });
            };

            changeValue('with spaces');
            (0, _chai.expect)($input.val()).to.equal('with spaces');

            changeValue('/with spaces');
            (0, _chai.expect)($input.val()).to.equal('/with spaces');
        });

        (0, _emberMocha.it)('doesn\'t mangle invalid urls on blur', function () {
            this.on('updateUrl', function () {
                return null;
            });
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem-url-input', [], ['baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [2, 47], [2, 54]]]]], [], []], 'url', ['subexpr', '@mut', [['get', 'url', ['loc', [null, [2, 59], [2, 62]]]]], [], []], 'isNew', ['subexpr', '@mut', [['get', 'isNew', ['loc', [null, [2, 69], [2, 74]]]]], [], []], 'change', 'updateUrl', 'clearErrors', ['subexpr', 'action', ['clearErrors'], [], ['loc', [null, [2, 106], [2, 128]]]]], ['loc', [null, [2, 16], [2, 130]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $input = this.$('input');

            run(function () {
                $input.val(currentUrl + ' /test').trigger('input').trigger('blur');
            });

            (0, _chai.expect)($input.val()).to.equal(currentUrl + ' /test');
        });

        (0, _emberMocha.it)('triggers "change" action on blur', function () {
            var changeActionCallCount = 0;
            this.on('updateUrl', function () {
                changeActionCallCount++;
            });

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem-url-input', [], ['baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [2, 47], [2, 54]]]]], [], []], 'url', ['subexpr', '@mut', [['get', 'url', ['loc', [null, [2, 59], [2, 62]]]]], [], []], 'isNew', ['subexpr', '@mut', [['get', 'isNew', ['loc', [null, [2, 69], [2, 74]]]]], [], []], 'change', 'updateUrl', 'clearErrors', ['subexpr', 'action', ['clearErrors'], [], ['loc', [null, [2, 106], [2, 128]]]]], ['loc', [null, [2, 16], [2, 130]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $input = this.$('input');

            $input.trigger('blur');

            (0, _chai.expect)(changeActionCallCount).to.equal(1);
        });

        (0, _emberMocha.it)('triggers "change" action on enter', function () {
            var changeActionCallCount = 0;
            this.on('updateUrl', function () {
                changeActionCallCount++;
            });

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem-url-input', [], ['baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [2, 47], [2, 54]]]]], [], []], 'url', ['subexpr', '@mut', [['get', 'url', ['loc', [null, [2, 59], [2, 62]]]]], [], []], 'isNew', ['subexpr', '@mut', [['get', 'isNew', ['loc', [null, [2, 69], [2, 74]]]]], [], []], 'change', 'updateUrl', 'clearErrors', ['subexpr', 'action', ['clearErrors'], [], ['loc', [null, [2, 106], [2, 128]]]]], ['loc', [null, [2, 16], [2, 130]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $input = this.$('input');

            run(function () {
                // TODO: why is ember's keyEvent helper not available here?
                var e = _ember['default'].$.Event('keypress');
                e.keyCode = 13;
                $input.trigger(e);
            });

            (0, _chai.expect)(changeActionCallCount).to.equal(1);
        });

        (0, _emberMocha.it)('triggers "change" action on CMD-S', function () {
            var changeActionCallCount = 0;
            this.on('updateUrl', function () {
                changeActionCallCount++;
            });

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem-url-input', [], ['baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [2, 47], [2, 54]]]]], [], []], 'url', ['subexpr', '@mut', [['get', 'url', ['loc', [null, [2, 59], [2, 62]]]]], [], []], 'isNew', ['subexpr', '@mut', [['get', 'isNew', ['loc', [null, [2, 69], [2, 74]]]]], [], []], 'change', 'updateUrl', 'clearErrors', ['subexpr', 'action', ['clearErrors'], [], ['loc', [null, [2, 106], [2, 128]]]]], ['loc', [null, [2, 16], [2, 130]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $input = this.$('input');

            run(function () {
                // TODO: why is ember's keyEvent helper not available here?
                var e = _ember['default'].$.Event('keydown');
                e.keyCode = 83;
                e.metaKey = true;
                $input.trigger(e);
            });

            (0, _chai.expect)(changeActionCallCount).to.equal(1);
        });

        (0, _emberMocha.it)('sends absolute urls straight through to change action', function () {
            var expectedUrl = '';

            this.on('updateUrl', function (url) {
                (0, _chai.expect)(url).to.equal(expectedUrl);
            });

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem-url-input', [], ['baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [2, 47], [2, 54]]]]], [], []], 'url', ['subexpr', '@mut', [['get', 'url', ['loc', [null, [2, 59], [2, 62]]]]], [], []], 'isNew', ['subexpr', '@mut', [['get', 'isNew', ['loc', [null, [2, 69], [2, 74]]]]], [], []], 'change', 'updateUrl', 'clearErrors', ['subexpr', 'action', ['clearErrors'], [], ['loc', [null, [2, 106], [2, 128]]]]], ['loc', [null, [2, 16], [2, 130]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $input = this.$('input');

            var testUrl = function testUrl(url) {
                expectedUrl = url;
                run(function () {
                    $input.val(url).trigger('input');
                });
                run(function () {
                    $input.trigger('blur');
                });
            };

            testUrl('http://example.com');
            testUrl('http://example.com/');
            testUrl('https://example.com');
            testUrl('//example.com');
            testUrl('//localhost:1234');
            testUrl('#anchor');
            testUrl('mailto:test@example.com');
            testUrl('tel:12345-567890');
            testUrl('javascript:alert("testing");');
        });

        (0, _emberMocha.it)('strips base url from relative urls before sending to change action', function () {
            var expectedUrl = '';

            this.on('updateUrl', function (url) {
                (0, _chai.expect)(url).to.equal(expectedUrl);
            });

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem-url-input', [], ['baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [2, 47], [2, 54]]]]], [], []], 'url', ['subexpr', '@mut', [['get', 'url', ['loc', [null, [2, 59], [2, 62]]]]], [], []], 'isNew', ['subexpr', '@mut', [['get', 'isNew', ['loc', [null, [2, 69], [2, 74]]]]], [], []], 'change', 'updateUrl', 'clearErrors', ['subexpr', 'action', ['clearErrors'], [], ['loc', [null, [2, 106], [2, 128]]]]], ['loc', [null, [2, 16], [2, 130]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $input = this.$('input');

            var testUrl = function testUrl(url) {
                expectedUrl = '/' + url;
                run(function () {
                    $input.val('' + currentUrl + url).trigger('input');
                });
                run(function () {
                    $input.trigger('blur');
                });
            };

            testUrl('about/');
            testUrl('about#contact');
            testUrl('test/nested/');
        });

        (0, _emberMocha.it)('handles links to subdomains of blog domain', function () {
            var expectedUrl = '';

            this.set('baseUrl', 'http://example.com/');

            this.on('updateUrl', function (url) {
                (0, _chai.expect)(url).to.equal(expectedUrl);
            });

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem-url-input', [], ['baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [2, 47], [2, 54]]]]], [], []], 'url', ['subexpr', '@mut', [['get', 'url', ['loc', [null, [2, 59], [2, 62]]]]], [], []], 'isNew', ['subexpr', '@mut', [['get', 'isNew', ['loc', [null, [2, 69], [2, 74]]]]], [], []], 'change', 'updateUrl', 'clearErrors', ['subexpr', 'action', ['clearErrors'], [], ['loc', [null, [2, 106], [2, 128]]]]], ['loc', [null, [2, 16], [2, 130]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $input = this.$('input');

            expectedUrl = 'http://test.example.com/';
            run(function () {
                $input.val(expectedUrl).trigger('input').trigger('blur');
            });
            (0, _chai.expect)($input.val()).to.equal(expectedUrl);
        });

        (0, _emberMocha.it)('adds trailing slash to relative URL', function () {
            var expectedUrl = '';

            this.on('updateUrl', function (url) {
                (0, _chai.expect)(url).to.equal(expectedUrl);
            });

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem-url-input', [], ['baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [2, 47], [2, 54]]]]], [], []], 'url', ['subexpr', '@mut', [['get', 'url', ['loc', [null, [2, 59], [2, 62]]]]], [], []], 'isNew', ['subexpr', '@mut', [['get', 'isNew', ['loc', [null, [2, 69], [2, 74]]]]], [], []], 'change', 'updateUrl', 'clearErrors', ['subexpr', 'action', ['clearErrors'], [], ['loc', [null, [2, 106], [2, 128]]]]], ['loc', [null, [2, 16], [2, 130]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $input = this.$('input');

            var testUrl = function testUrl(url) {
                expectedUrl = '/' + url + '/';
                run(function () {
                    $input.val('' + currentUrl + url).trigger('input');
                });
                run(function () {
                    $input.trigger('blur');
                });
            };

            testUrl('about');
            testUrl('test/nested');
        });

        (0, _emberMocha.it)('does not add trailing slash on relative URL with [.?#]', function () {
            var expectedUrl = '';

            this.on('updateUrl', function (url) {
                (0, _chai.expect)(url).to.equal(expectedUrl);
            });

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem-url-input', [], ['baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [2, 47], [2, 54]]]]], [], []], 'url', ['subexpr', '@mut', [['get', 'url', ['loc', [null, [2, 59], [2, 62]]]]], [], []], 'isNew', ['subexpr', '@mut', [['get', 'isNew', ['loc', [null, [2, 69], [2, 74]]]]], [], []], 'change', 'updateUrl', 'clearErrors', ['subexpr', 'action', ['clearErrors'], [], ['loc', [null, [2, 106], [2, 128]]]]], ['loc', [null, [2, 16], [2, 130]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $input = this.$('input');

            var testUrl = function testUrl(url) {
                expectedUrl = '/' + url;
                run(function () {
                    $input.val('' + currentUrl + url).trigger('input');
                });
                run(function () {
                    $input.trigger('blur');
                });
            };

            testUrl('about#contact');
            testUrl('test/nested.svg');
            testUrl('test?gho=sties');
            testUrl('test/nested?sli=mer');
        });

        (0, _emberMocha.it)('does not add trailing slash on non-relative URLs', function () {
            var expectedUrl = '';

            this.on('updateUrl', function (url) {
                (0, _chai.expect)(url).to.equal(expectedUrl);
            });

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-navitem-url-input', [], ['baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [2, 47], [2, 54]]]]], [], []], 'url', ['subexpr', '@mut', [['get', 'url', ['loc', [null, [2, 59], [2, 62]]]]], [], []], 'isNew', ['subexpr', '@mut', [['get', 'isNew', ['loc', [null, [2, 69], [2, 74]]]]], [], []], 'change', 'updateUrl', 'clearErrors', ['subexpr', 'action', ['clearErrors'], [], ['loc', [null, [2, 106], [2, 128]]]]], ['loc', [null, [2, 16], [2, 130]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $input = this.$('input');

            var testUrl = function testUrl(url) {
                expectedUrl = '/' + url;
                run(function () {
                    $input.val('' + currentUrl + url).trigger('input');
                });
                run(function () {
                    $input.trigger('blur');
                });
            };

            testUrl('http://woo.ff/test');
            testUrl('http://me.ow:2342/nested/test');
            testUrl('https://wro.om/car#race');
            testUrl('https://kabo.om/explosion?really=now');
        });

        describe('with sub-folder baseUrl', function () {
            beforeEach(function () {
                this.set('baseUrl', currentUrl + 'blog/');
            });

            (0, _emberMocha.it)('handles URLs relative to base url', function () {
                var expectedUrl = '';

                this.on('updateUrl', function (url) {
                    (0, _chai.expect)(url).to.equal(expectedUrl);
                });

                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 3,
                                    'column': 16
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createTextNode('\n                    ');
                            dom.appendChild(el0, el1);
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            var el1 = dom.createTextNode('\n                ');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                            return morphs;
                        },
                        statements: [['inline', 'gh-navitem-url-input', [], ['baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [2, 51], [2, 58]]]]], [], []], 'url', ['subexpr', '@mut', [['get', 'url', ['loc', [null, [2, 63], [2, 66]]]]], [], []], 'isNew', ['subexpr', '@mut', [['get', 'isNew', ['loc', [null, [2, 73], [2, 78]]]]], [], []], 'change', 'updateUrl', 'clearErrors', ['subexpr', 'action', ['clearErrors'], [], ['loc', [null, [2, 110], [2, 132]]]]], ['loc', [null, [2, 20], [2, 134]]]]],
                        locals: [],
                        templates: []
                    };
                })()));
                var $input = this.$('input');

                var testUrl = function testUrl(url) {
                    expectedUrl = url;
                    run(function () {
                        $input.val(currentUrl + 'blog' + url).trigger('input');
                    });
                    run(function () {
                        $input.trigger('blur');
                    });
                };

                testUrl('/about/');
                testUrl('/about#contact');
                testUrl('/test/nested/');
            });

            (0, _emberMocha.it)('handles URLs relative to base host', function () {
                var expectedUrl = '';

                this.on('updateUrl', function (url) {
                    (0, _chai.expect)(url).to.equal(expectedUrl);
                });

                this.render(_ember['default'].HTMLBars.template((function () {
                    return {
                        meta: {
                            'fragmentReason': {
                                'name': 'missing-wrapper',
                                'problems': ['wrong-type']
                            },
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 1,
                                    'column': 0
                                },
                                'end': {
                                    'line': 3,
                                    'column': 16
                                }
                            }
                        },
                        isEmpty: false,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            var el1 = dom.createTextNode('\n                    ');
                            dom.appendChild(el0, el1);
                            var el1 = dom.createComment('');
                            dom.appendChild(el0, el1);
                            var el1 = dom.createTextNode('\n                ');
                            dom.appendChild(el0, el1);
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                            var morphs = new Array(1);
                            morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                            return morphs;
                        },
                        statements: [['inline', 'gh-navitem-url-input', [], ['baseUrl', ['subexpr', '@mut', [['get', 'baseUrl', ['loc', [null, [2, 51], [2, 58]]]]], [], []], 'url', ['subexpr', '@mut', [['get', 'url', ['loc', [null, [2, 63], [2, 66]]]]], [], []], 'isNew', ['subexpr', '@mut', [['get', 'isNew', ['loc', [null, [2, 73], [2, 78]]]]], [], []], 'change', 'updateUrl', 'clearErrors', ['subexpr', 'action', ['clearErrors'], [], ['loc', [null, [2, 110], [2, 132]]]]], ['loc', [null, [2, 20], [2, 134]]]]],
                        locals: [],
                        templates: []
                    };
                })()));
                var $input = this.$('input');

                var testUrl = function testUrl(url) {
                    expectedUrl = url;
                    run(function () {
                        $input.val(url).trigger('input');
                    });
                    run(function () {
                        $input.trigger('blur');
                    });
                };

                testUrl('http://' + window.location.host);
                testUrl('https://' + window.location.host);
                testUrl('http://' + window.location.host + '/');
                testUrl('https://' + window.location.host + '/');
                testUrl('http://' + window.location.host + '/test');
                testUrl('https://' + window.location.host + '/test');
                testUrl('http://' + window.location.host + '/#test');
                testUrl('https://' + window.location.host + '/#test');
                testUrl('http://' + window.location.host + '/another/folder');
                testUrl('https://' + window.location.host + '/another/folder');
            });
        });
    });
});
/* jshint scripturl:true */
define('ghost-admin/tests/integration/components/gh-notification-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeComponent)('gh-notification', 'Integration: Component: gh-notification', {
        integration: true
    }, function () {
        (0, _emberMocha.it)('renders', function () {
            this.set('message', { message: 'Test message', type: 'success' });

            this.render(Ember.HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 35
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-notification', [], ['message', ['subexpr', '@mut', [['get', 'message', ['loc', [null, [1, 26], [1, 33]]]]], [], []]], ['loc', [null, [1, 0], [1, 35]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            (0, _chai.expect)(this.$('article.gh-notification')).to.have.length(1);
            var $notification = this.$('.gh-notification');

            (0, _chai.expect)($notification.hasClass('gh-notification-passive')).to.be['true'];
            (0, _chai.expect)($notification.text()).to.match(/Test message/);
        });

        (0, _emberMocha.it)('maps message types to CSS classes', function () {
            this.set('message', { message: 'Test message', type: 'success' });

            this.render(Ember.HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 35
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-notification', [], ['message', ['subexpr', '@mut', [['get', 'message', ['loc', [null, [1, 26], [1, 33]]]]], [], []]], ['loc', [null, [1, 0], [1, 35]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            var $notification = this.$('.gh-notification');

            this.set('message.type', 'success');
            (0, _chai.expect)($notification.hasClass('gh-notification-green'), 'success class isn\'t green').to.be['true'];

            this.set('message.type', 'error');
            (0, _chai.expect)($notification.hasClass('gh-notification-red'), 'success class isn\'t red').to.be['true'];

            this.set('message.type', 'warn');
            (0, _chai.expect)($notification.hasClass('gh-notification-yellow'), 'success class isn\'t yellow').to.be['true'];
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/components/gh-notifications-test', ['exports', 'chai', 'ember-mocha', 'ember'], function (exports, _chai, _emberMocha, _ember) {
    var Service = _ember['default'].Service;
    var run = _ember['default'].run;

    var emberA = _ember['default'].A;

    var notificationsStub = Service.extend({
        notifications: emberA()
    });

    (0, _emberMocha.describeComponent)('gh-notifications', 'Integration: Component: gh-notifications', {
        integration: true
    }, function () {
        beforeEach(function () {
            this.register('service:notifications', notificationsStub);
            this.inject.service('notifications', { as: 'notifications' });

            this.set('notifications.notifications', [{ message: 'First', type: 'error' }, { message: 'Second', type: 'warn' }]);
        });

        (0, _emberMocha.it)('renders', function () {
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 20
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['content', 'gh-notifications', ['loc', [null, [1, 0], [1, 20]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _chai.expect)(this.$('.gh-notifications').length).to.equal(1);

            (0, _chai.expect)(this.$('.gh-notifications').children().length).to.equal(2);

            this.set('notifications.notifications', emberA());
            (0, _chai.expect)(this.$('.gh-notifications').children().length).to.equal(0);
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/components/gh-profile-image-test', ['exports', 'chai', 'ember-mocha', 'ember', 'pretender', 'ember-test-helpers/wait'], function (exports, _chai, _emberMocha, _ember, _pretender, _emberTestHelpersWait) {
    var run = _ember['default'].run;

    var pathsStub = _ember['default'].Service.extend({
        url: {
            api: function api() {
                return '';
            },
            asset: function asset(src) {
                return src;
            }
        }
    });

    var stubKnownGravatar = function stubKnownGravatar(server) {
        server.get('http://www.gravatar.com/avatar/:md5', function () {
            return [200, { 'Content-Type': 'image/png' }, ''];
        });
    };

    var stubUnknownGravatar = function stubUnknownGravatar(server) {
        server.get('http://www.gravatar.com/avatar/:md5', function () {
            return [404, {}, ''];
        });
    };

    (0, _emberMocha.describeComponent)('gh-profile-image', 'Integration: Component: gh-profile-image', {
        integration: true
    }, function () {
        var server = undefined;

        beforeEach(function () {
            this.register('service:ghost-paths', pathsStub);
            this.inject.service('ghost-paths', { as: 'ghost-paths' });

            server = new _pretender['default']();
            stubKnownGravatar(server);
        });

        afterEach(function () {
            server.shutdown();
        });

        (0, _emberMocha.it)('renders', function () {
            this.set('email', '');

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-profile-image', [], ['email', ['subexpr', '@mut', [['get', 'email', ['loc', [null, [2, 41], [2, 46]]]]], [], []]], ['loc', [null, [2, 16], [2, 48]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            (0, _chai.expect)(this.$()).to.have.length(1);
        });

        (0, _emberMocha.it)('renders and tears down ok with fileStorage:false', function () {
            this.set('fileStorage', false);

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-profile-image', [], ['fileStorage', ['subexpr', '@mut', [['get', 'fileStorage', ['loc', [null, [2, 47], [2, 58]]]]], [], []]], ['loc', [null, [2, 16], [2, 60]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            (0, _chai.expect)(this.$()).to.have.length(1);
            (0, _chai.expect)(this.$('input')).to.have.length(0);
        }), (0, _emberMocha.it)('renders default image if no email supplied', function () {
            this.set('email', null);

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-profile-image', [], ['email', ['subexpr', '@mut', [['get', 'email', ['loc', [null, [2, 41], [2, 46]]]]], [], []], 'size', 100, 'debounce', 50], ['loc', [null, [2, 16], [2, 69]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            (0, _chai.expect)(this.$('.gravatar-img').attr('style'), 'gravatar image style').to.be.blank;
        });

        (0, _emberMocha.it)('renders the gravatar if valid email supplied', function (done) {
            var _this = this;

            var email = 'test@example.com';
            var expectedUrl = '//www.gravatar.com/avatar/' + md5(email) + '?s=100&d=404';

            this.set('email', email);

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-profile-image', [], ['email', ['subexpr', '@mut', [['get', 'email', ['loc', [null, [2, 41], [2, 46]]]]], [], []], 'size', 100, 'debounce', 50], ['loc', [null, [2, 16], [2, 69]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            // wait for the ajax request to complete
            (0, _emberTestHelpersWait['default'])().then(function () {
                (0, _chai.expect)(_this.$('.gravatar-img').attr('style'), 'gravatar image style').to.equal('background-image: url(' + expectedUrl + ')');
                done();
            });
        });

        (0, _emberMocha.it)('doesn\'t add background url if gravatar image doesn\'t exist', function (done) {
            var _this2 = this;

            stubUnknownGravatar(server);

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-profile-image', [], ['email', 'test@example.com', 'size', 100, 'debounce', 50], ['loc', [null, [2, 16], [2, 82]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            (0, _emberTestHelpersWait['default'])().then(function () {
                (0, _chai.expect)(_this2.$('.gravatar-img').attr('style'), 'gravatar image style').to.be.blank;
                done();
            });
        });

        (0, _emberMocha.it)('throttles gravatar loading as email is changed', function (done) {
            var _this3 = this;

            var email = 'test@example.com';
            var expectedUrl = '//www.gravatar.com/avatar/' + md5(email) + '?s=100&d=404';

            this.set('email', 'test');

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-profile-image', [], ['email', ['subexpr', '@mut', [['get', 'email', ['loc', [null, [2, 41], [2, 46]]]]], [], []], 'size', 100, 'debounce', 300], ['loc', [null, [2, 16], [2, 70]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            run(function () {
                _this3.set('email', email);
            });

            (0, _chai.expect)(this.$('.gravatar-img').attr('style'), '.gravatar-img background not immediately changed on email change').to.be.blank;

            run.later(this, function () {
                (0, _chai.expect)(this.$('.gravatar-img').attr('style'), '.gravatar-img background still not changed before debounce timeout').to.be.blank;
            }, 250);

            run.later(this, function () {
                (0, _chai.expect)(this.$('.gravatar-img').attr('style'), '.gravatar-img background changed after debounce timeout').to.equal('background-image: url(' + expectedUrl + ')');
                done();
            }, 400);
        });
    });
});
/* jshint expr:true */
/* global md5 */
define('ghost-admin/tests/integration/components/gh-search-input-test', ['exports', 'chai', 'ember-mocha', 'ember'], function (exports, _chai, _emberMocha, _ember) {
    var run = _ember['default'].run;

    (0, _emberMocha.describeComponent)('gh-search-input', 'Integration: Component: gh-search-input', {
        integration: true
    }, function () {
        (0, _emberMocha.it)('renders', function () {
            // renders the component on the page
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 19
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['content', 'gh-search-input', ['loc', [null, [1, 0], [1, 19]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            (0, _chai.expect)(this.$('.ember-power-select-search input')).to.have.length(1);
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/components/gh-subscribers-table-test', ['exports', 'chai', 'ember-mocha', 'ember-light-table'], function (exports, _chai, _emberMocha, _emberLightTable) {

    (0, _emberMocha.describeComponent)('gh-subscribers-table', 'Integration: Component: gh-subscribers-table', {
        integration: true
    }, function () {
        (0, _emberMocha.it)('renders', function () {
            this.set('table', new _emberLightTable['default']([], []));
            this.set('sortByColumn', function () {});
            this.set('delete', function () {});

            this.render(Ember.HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 94
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'gh-subscribers-table', [], ['table', ['subexpr', '@mut', [['get', 'table', ['loc', [null, [1, 29], [1, 34]]]]], [], []], 'sortByColumn', ['subexpr', 'action', [['get', 'sortByColumn', ['loc', [null, [1, 56], [1, 68]]]]], [], ['loc', [null, [1, 48], [1, 69]]]], 'delete', ['subexpr', 'action', [['get', 'delete', ['loc', [null, [1, 85], [1, 91]]]]], [], ['loc', [null, [1, 77], [1, 92]]]]], ['loc', [null, [1, 0], [1, 94]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _chai.expect)(this.$()).to.have.length(1);
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/components/gh-tag-settings-form-test', ['exports', 'chai', 'ember-mocha', 'ember', 'ember-data'], function (exports, _chai, _emberMocha, _ember, _emberData) {
    var run = _ember['default'].run;

    var configStub = _ember['default'].Service.extend({
        blogUrl: 'http://localhost:2368'
    });

    var mediaQueriesStub = _ember['default'].Service.extend({
        maxWidth600: false
    });

    (0, _emberMocha.describeComponent)('gh-tag-settings-form', 'Integration: Component: gh-tag-settings-form', {
        integration: true
    }, function () {
        beforeEach(function () {
            /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
            var tag = _ember['default'].Object.create({
                id: 1,
                name: 'Test',
                slug: 'test',
                description: 'Description.',
                metaTitle: 'Meta Title',
                metaDescription: 'Meta description',
                errors: _emberData['default'].Errors.create(),
                hasValidated: []
            });
            /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */

            this.set('tag', tag);
            this.set('actions.setProperty', function (property, value) {
                // this should be overridden if a call is expected
                console.error('setProperty called \'' + property + ': ' + value + '\'');
            });

            this.register('service:config', configStub);
            this.inject.service('config', { as: 'config' });

            this.register('service:media-queries', mediaQueriesStub);
            this.inject.service('media-queries', { as: 'mediaQueries' });
        });

        (0, _emberMocha.it)('renders', function () {
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-tag-settings-form', [], ['tag', ['subexpr', '@mut', [['get', 'tag', ['loc', [null, [2, 43], [2, 46]]]]], [], []], 'setProperty', ['subexpr', 'action', ['setProperty'], [], ['loc', [null, [2, 59], [2, 81]]]]], ['loc', [null, [2, 16], [2, 83]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _chai.expect)(this.$()).to.have.length(1);
        });

        (0, _emberMocha.it)('has the correct title', function () {
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-tag-settings-form', [], ['tag', ['subexpr', '@mut', [['get', 'tag', ['loc', [null, [2, 43], [2, 46]]]]], [], []], 'setProperty', ['subexpr', 'action', ['setProperty'], [], ['loc', [null, [2, 59], [2, 81]]]]], ['loc', [null, [2, 16], [2, 83]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _chai.expect)(this.$('.tag-settings-pane h4').text(), 'existing tag title').to.equal('Tag Settings');

            this.set('tag.isNew', true);
            (0, _chai.expect)(this.$('.tag-settings-pane h4').text(), 'new tag title').to.equal('New Tag');
        });

        (0, _emberMocha.it)('renders main settings', function () {
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-tag-settings-form', [], ['tag', ['subexpr', '@mut', [['get', 'tag', ['loc', [null, [2, 43], [2, 46]]]]], [], []], 'setProperty', ['subexpr', 'action', ['setProperty'], [], ['loc', [null, [2, 59], [2, 81]]]]], ['loc', [null, [2, 16], [2, 83]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            (0, _chai.expect)(this.$('.gh-image-uploader').length, 'displays image uploader').to.equal(1);
            (0, _chai.expect)(this.$('input[name="name"]').val(), 'name field value').to.equal('Test');
            (0, _chai.expect)(this.$('input[name="slug"]').val(), 'slug field value').to.equal('test');
            (0, _chai.expect)(this.$('textarea[name="description"]').val(), 'description field value').to.equal('Description.');
            (0, _chai.expect)(this.$('input[name="metaTitle"]').val(), 'metaTitle field value').to.equal('Meta Title');
            (0, _chai.expect)(this.$('textarea[name="metaDescription"]').val(), 'metaDescription field value').to.equal('Meta description');
        });

        (0, _emberMocha.it)('can switch between main/meta settings', function () {
            var _this = this;

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-tag-settings-form', [], ['tag', ['subexpr', '@mut', [['get', 'tag', ['loc', [null, [2, 43], [2, 46]]]]], [], []], 'setProperty', ['subexpr', 'action', ['setProperty'], [], ['loc', [null, [2, 59], [2, 81]]]]], ['loc', [null, [2, 16], [2, 83]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            (0, _chai.expect)(this.$('.tag-settings-pane').hasClass('settings-menu-pane-in'), 'main settings are displayed by default').to.be['true'];
            (0, _chai.expect)(this.$('.tag-meta-settings-pane').hasClass('settings-menu-pane-out-right'), 'meta settings are hidden by default').to.be['true'];

            run(function () {
                _this.$('.meta-data-button').click();
            });

            (0, _chai.expect)(this.$('.tag-settings-pane').hasClass('settings-menu-pane-out-left'), 'main settings are hidden after clicking Meta Data button').to.be['true'];
            (0, _chai.expect)(this.$('.tag-meta-settings-pane').hasClass('settings-menu-pane-in'), 'meta settings are displayed after clicking Meta Data button').to.be['true'];

            run(function () {
                _this.$('.back').click();
            });

            (0, _chai.expect)(this.$('.tag-settings-pane').hasClass('settings-menu-pane-in'), 'main settings are displayed after clicking "back"').to.be['true'];
            (0, _chai.expect)(this.$('.tag-meta-settings-pane').hasClass('settings-menu-pane-out-right'), 'meta settings are hidden after clicking "back"').to.be['true'];
        });

        (0, _emberMocha.it)('has one-way binding for properties', function () {
            var _this2 = this;

            this.set('actions.setProperty', function () {
                // noop
            });

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-tag-settings-form', [], ['tag', ['subexpr', '@mut', [['get', 'tag', ['loc', [null, [2, 43], [2, 46]]]]], [], []], 'setProperty', ['subexpr', 'action', ['setProperty'], [], ['loc', [null, [2, 59], [2, 81]]]]], ['loc', [null, [2, 16], [2, 83]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            run(function () {
                _this2.$('input[name="name"]').val('New name');
                _this2.$('input[name="slug"]').val('new-slug');
                _this2.$('textarea[name="description"]').val('New description');
                _this2.$('input[name="metaTitle"]').val('New metaTitle');
                _this2.$('textarea[name="metaDescription"]').val('New metaDescription');
            });

            (0, _chai.expect)(this.get('tag.name'), 'tag name').to.equal('Test');
            (0, _chai.expect)(this.get('tag.slug'), 'tag slug').to.equal('test');
            (0, _chai.expect)(this.get('tag.description'), 'tag description').to.equal('Description.');
            (0, _chai.expect)(this.get('tag.metaTitle'), 'tag metaTitle').to.equal('Meta Title');
            (0, _chai.expect)(this.get('tag.metaDescription'), 'tag metaDescription').to.equal('Meta description');
        });

        (0, _emberMocha.it)('triggers setProperty action on blur of all fields', function () {
            var _this3 = this;

            var expectedProperty = '';
            var expectedValue = '';

            this.set('actions.setProperty', function (property, value) {
                (0, _chai.expect)(property, 'property').to.equal(expectedProperty);
                (0, _chai.expect)(value, 'value').to.equal(expectedValue);
            });

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-tag-settings-form', [], ['tag', ['subexpr', '@mut', [['get', 'tag', ['loc', [null, [2, 43], [2, 46]]]]], [], []], 'setProperty', ['subexpr', 'action', ['setProperty'], [], ['loc', [null, [2, 59], [2, 81]]]]], ['loc', [null, [2, 16], [2, 83]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            expectedProperty = 'name';
            expectedValue = 'new-slug';
            run(function () {
                _this3.$('input[name="name"]').val('New name');
            });

            expectedProperty = 'url';
            expectedValue = 'new-slug';
            run(function () {
                _this3.$('input[name="slug"]').val('new-slug');
            });

            expectedProperty = 'description';
            expectedValue = 'New description';
            run(function () {
                _this3.$('textarea[name="description"]').val('New description');
            });

            expectedProperty = 'metaTitle';
            expectedValue = 'New metaTitle';
            run(function () {
                _this3.$('input[name="metaTitle"]').val('New metaTitle');
            });

            expectedProperty = 'metaDescription';
            expectedValue = 'New metaDescription';
            run(function () {
                _this3.$('textarea[name="metaDescription"]').val('New metaDescription');
            });
        });

        (0, _emberMocha.it)('displays error messages for validated fields', function () {
            var errors = this.get('tag.errors');
            var hasValidated = this.get('tag.hasValidated');

            errors.add('name', 'must be present');
            hasValidated.push('name');

            errors.add('slug', 'must be present');
            hasValidated.push('slug');

            errors.add('description', 'is too long');
            hasValidated.push('description');

            errors.add('metaTitle', 'is too long');
            hasValidated.push('metaTitle');

            errors.add('metaDescription', 'is too long');
            hasValidated.push('metaDescription');

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-tag-settings-form', [], ['tag', ['subexpr', '@mut', [['get', 'tag', ['loc', [null, [2, 43], [2, 46]]]]], [], []], 'setProperty', ['subexpr', 'action', ['setProperty'], [], ['loc', [null, [2, 59], [2, 81]]]]], ['loc', [null, [2, 16], [2, 83]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            var nameFormGroup = this.$('input[name="name"]').closest('.form-group');
            (0, _chai.expect)(nameFormGroup.hasClass('error'), 'name form group has error state').to.be['true'];
            (0, _chai.expect)(nameFormGroup.find('.response').length, 'name form group has error message').to.equal(1);

            var slugFormGroup = this.$('input[name="slug"]').closest('.form-group');
            (0, _chai.expect)(slugFormGroup.hasClass('error'), 'slug form group has error state').to.be['true'];
            (0, _chai.expect)(slugFormGroup.find('.response').length, 'slug form group has error message').to.equal(1);

            var descriptionFormGroup = this.$('textarea[name="description"]').closest('.form-group');
            (0, _chai.expect)(descriptionFormGroup.hasClass('error'), 'description form group has error state').to.be['true'];

            var metaTitleFormGroup = this.$('input[name="metaTitle"]').closest('.form-group');
            (0, _chai.expect)(metaTitleFormGroup.hasClass('error'), 'metaTitle form group has error state').to.be['true'];
            (0, _chai.expect)(metaTitleFormGroup.find('.response').length, 'metaTitle form group has error message').to.equal(1);

            var metaDescriptionFormGroup = this.$('textarea[name="metaDescription"]').closest('.form-group');
            (0, _chai.expect)(metaDescriptionFormGroup.hasClass('error'), 'metaDescription form group has error state').to.be['true'];
            (0, _chai.expect)(metaDescriptionFormGroup.find('.response').length, 'metaDescription form group has error message').to.equal(1);
        });

        (0, _emberMocha.it)('displays char count for text fields', function () {
            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-tag-settings-form', [], ['tag', ['subexpr', '@mut', [['get', 'tag', ['loc', [null, [2, 43], [2, 46]]]]], [], []], 'setProperty', ['subexpr', 'action', ['setProperty'], [], ['loc', [null, [2, 59], [2, 81]]]]], ['loc', [null, [2, 16], [2, 83]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            var descriptionFormGroup = this.$('textarea[name="description"]').closest('.form-group');
            (0, _chai.expect)(descriptionFormGroup.find('.word-count').text(), 'description char count').to.equal('12');

            var metaDescriptionFormGroup = this.$('textarea[name="metaDescription"]').closest('.form-group');
            (0, _chai.expect)(metaDescriptionFormGroup.find('.word-count').text(), 'description char count').to.equal('16');
        });

        (0, _emberMocha.it)('renders SEO title preview', function () {
            var _this4 = this;

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-tag-settings-form', [], ['tag', ['subexpr', '@mut', [['get', 'tag', ['loc', [null, [2, 43], [2, 46]]]]], [], []], 'setProperty', ['subexpr', 'action', ['setProperty'], [], ['loc', [null, [2, 59], [2, 81]]]]], ['loc', [null, [2, 16], [2, 83]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _chai.expect)(this.$('.seo-preview-title').text(), 'displays meta title if present').to.equal('Meta Title');

            run(function () {
                _this4.set('tag.metaTitle', '');
            });
            (0, _chai.expect)(this.$('.seo-preview-title').text(), 'falls back to tag name without metaTitle').to.equal('Test');

            run(function () {
                _this4.set('tag.name', new Array(151).join('x'));
            });
            var expectedLength = 70 + '…'.length;
            (0, _chai.expect)(this.$('.seo-preview-title').text().length, 'cuts title to max 70 chars').to.equal(expectedLength);
        });

        (0, _emberMocha.it)('renders SEO URL preview', function () {
            var _this5 = this;

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-tag-settings-form', [], ['tag', ['subexpr', '@mut', [['get', 'tag', ['loc', [null, [2, 43], [2, 46]]]]], [], []], 'setProperty', ['subexpr', 'action', ['setProperty'], [], ['loc', [null, [2, 59], [2, 81]]]]], ['loc', [null, [2, 16], [2, 83]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _chai.expect)(this.$('.seo-preview-link').text(), 'adds url and tag prefix').to.equal('http://localhost:2368/tag/test/');

            run(function () {
                _this5.set('tag.slug', new Array(151).join('x'));
            });
            var expectedLength = 70 + '…'.length;
            (0, _chai.expect)(this.$('.seo-preview-link').text().length, 'cuts slug to max 70 chars').to.equal(expectedLength);
        });

        (0, _emberMocha.it)('renders SEO description preview', function () {
            var _this6 = this;

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-tag-settings-form', [], ['tag', ['subexpr', '@mut', [['get', 'tag', ['loc', [null, [2, 43], [2, 46]]]]], [], []], 'setProperty', ['subexpr', 'action', ['setProperty'], [], ['loc', [null, [2, 59], [2, 81]]]]], ['loc', [null, [2, 16], [2, 83]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _chai.expect)(this.$('.seo-preview-description').text(), 'displays meta description if present').to.equal('Meta description');

            run(function () {
                _this6.set('tag.metaDescription', '');
            });
            (0, _chai.expect)(this.$('.seo-preview-description').text(), 'falls back to tag description without metaDescription').to.equal('Description.');

            run(function () {
                _this6.set('tag.description', new Array(200).join('x'));
            });
            var expectedLength = 156 + '…'.length;
            (0, _chai.expect)(this.$('.seo-preview-description').text().length, 'cuts description to max 156 chars').to.equal(expectedLength);
        });

        (0, _emberMocha.it)('resets if a new tag is received', function () {
            var _this7 = this;

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-tag-settings-form', [], ['tag', ['subexpr', '@mut', [['get', 'tag', ['loc', [null, [2, 43], [2, 46]]]]], [], []], 'setProperty', ['subexpr', 'action', ['setProperty'], [], ['loc', [null, [2, 59], [2, 81]]]]], ['loc', [null, [2, 16], [2, 83]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            run(function () {
                _this7.$('.meta-data-button').click();
            });
            (0, _chai.expect)(this.$('.tag-meta-settings-pane').hasClass('settings-menu-pane-in'), 'meta data pane is shown').to.be['true'];

            run(function () {
                _this7.set('tag', _ember['default'].Object.create({ id: '2' }));
            });
            (0, _chai.expect)(this.$('.tag-settings-pane').hasClass('settings-menu-pane-in'), 'resets to main settings').to.be['true'];
        });

        (0, _emberMocha.it)('triggers delete tag modal on delete click', function (done) {
            var _this8 = this;

            // TODO: will time out if this isn't hit, there's probably a better
            // way of testing this
            this.set('actions.openModal', function () {
                done();
            });

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-tag-settings-form', [], ['tag', ['subexpr', '@mut', [['get', 'tag', ['loc', [null, [2, 43], [2, 46]]]]], [], []], 'setProperty', ['subexpr', 'action', ['setProperty'], [], ['loc', [null, [2, 59], [2, 81]]]], 'showDeleteTagModal', ['subexpr', 'action', ['openModal'], [], ['loc', [null, [2, 101], [2, 121]]]]], ['loc', [null, [2, 16], [2, 123]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            run(function () {
                _this8.$('.tag-delete-button').click();
            });
        });

        (0, _emberMocha.it)('shows settings.tags arrow link on mobile', function () {
            this.set('mediaQueries.maxWidth600', true);

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['inline', 'gh-tag-settings-form', [], ['tag', ['subexpr', '@mut', [['get', 'tag', ['loc', [null, [2, 43], [2, 46]]]]], [], []], 'setProperty', ['subexpr', 'action', ['setProperty'], [], ['loc', [null, [2, 59], [2, 81]]]]], ['loc', [null, [2, 16], [2, 83]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            (0, _chai.expect)(this.$('.tag-settings-pane .settings-menu-header .settings-menu-header-action').length, 'settings.tags link is shown').to.equal(1);
        });
    });
});
/* jshint expr:true */
/* jscs:disable requireTemplateStringsForConcatenation */
define('ghost-admin/tests/integration/components/gh-tags-management-container-test', ['exports', 'chai', 'ember-mocha', 'ember'], function (exports, _chai, _emberMocha, _ember) {

    (0, _emberMocha.describeComponent)('gh-tags-management-container', 'Integration: Component: gh-tags-management-container', {
        integration: true
    }, function () {
        (0, _emberMocha.it)('renders', function () {
            this.set('tags', []);
            this.set('selectedTag', null);
            this.on('enteredMobile', function () {
                // noop
            });
            this.on('leftMobile', function () {
                // noop
            });

            this.render(_ember['default'].HTMLBars.template((function () {
                var child0 = (function () {
                    return {
                        meta: {
                            'fragmentReason': false,
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 2,
                                    'column': 16
                                },
                                'end': {
                                    'line': 2,
                                    'column': 137
                                }
                            }
                        },
                        isEmpty: true,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes() {
                            return [];
                        },
                        statements: [],
                        locals: [],
                        templates: []
                    };
                })();

                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 3,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n                ');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('\n            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['block', 'gh-tags-management-container', [], ['tags', ['subexpr', '@mut', [['get', 'tags', ['loc', [null, [2, 53], [2, 57]]]]], [], []], 'selectedTag', ['subexpr', '@mut', [['get', 'selectedTag', ['loc', [null, [2, 70], [2, 81]]]]], [], []], 'enteredMobile', 'enteredMobile', 'leftMobile', 'leftMobile'], 0, null, ['loc', [null, [2, 16], [2, 170]]]]],
                    locals: [],
                    templates: [child0]
                };
            })()));
            (0, _chai.expect)(this.$()).to.have.length(1);
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/components/gh-validation-status-container-test', ['exports', 'chai', 'ember-mocha', 'ember', 'ember-data'], function (exports, _chai, _emberMocha, _ember, _emberData) {

    (0, _emberMocha.describeComponent)('gh-validation-status-container', 'Integration: Component: gh-validation-status-container', {
        integration: true
    }, function () {
        beforeEach(function () {
            var testObject = new _ember['default'].Object();
            testObject.set('name', 'Test');
            testObject.set('hasValidated', []);
            testObject.set('errors', _emberData['default'].Errors.create());

            this.set('testObject', testObject);
        });

        (0, _emberMocha.it)('has no success/error class by default', function () {
            this.render(_ember['default'].HTMLBars.template((function () {
                var child0 = (function () {
                    return {
                        meta: {
                            'fragmentReason': false,
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 2,
                                    'column': 16
                                },
                                'end': {
                                    'line': 3,
                                    'column': 16
                                }
                            }
                        },
                        isEmpty: true,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes() {
                            return [];
                        },
                        statements: [],
                        locals: [],
                        templates: []
                    };
                })();

                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 4,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['block', 'gh-validation-status-container', [], ['class', 'gh-test', 'property', 'name', 'errors', ['subexpr', '@mut', [['get', 'testObject.errors', ['loc', [null, [2, 89], [2, 106]]]]], [], []], 'hasValidated', ['subexpr', '@mut', [['get', 'testObject.hasValidated', ['loc', [null, [2, 120], [2, 143]]]]], [], []]], 0, null, ['loc', [null, [2, 16], [3, 51]]]]],
                    locals: [],
                    templates: [child0]
                };
            })()));
            (0, _chai.expect)(this.$('.gh-test')).to.have.length(1);
            (0, _chai.expect)(this.$('.gh-test').hasClass('success')).to.be['false'];
            (0, _chai.expect)(this.$('.gh-test').hasClass('error')).to.be['false'];
        });

        (0, _emberMocha.it)('has success class when valid', function () {
            this.get('testObject.hasValidated').push('name');

            this.render(_ember['default'].HTMLBars.template((function () {
                var child0 = (function () {
                    return {
                        meta: {
                            'fragmentReason': false,
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 2,
                                    'column': 16
                                },
                                'end': {
                                    'line': 3,
                                    'column': 16
                                }
                            }
                        },
                        isEmpty: true,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes() {
                            return [];
                        },
                        statements: [],
                        locals: [],
                        templates: []
                    };
                })();

                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 4,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['block', 'gh-validation-status-container', [], ['class', 'gh-test', 'property', 'name', 'errors', ['subexpr', '@mut', [['get', 'testObject.errors', ['loc', [null, [2, 89], [2, 106]]]]], [], []], 'hasValidated', ['subexpr', '@mut', [['get', 'testObject.hasValidated', ['loc', [null, [2, 120], [2, 143]]]]], [], []]], 0, null, ['loc', [null, [2, 16], [3, 51]]]]],
                    locals: [],
                    templates: [child0]
                };
            })()));
            (0, _chai.expect)(this.$('.gh-test')).to.have.length(1);
            (0, _chai.expect)(this.$('.gh-test').hasClass('success')).to.be['true'];
            (0, _chai.expect)(this.$('.gh-test').hasClass('error')).to.be['false'];
        });

        (0, _emberMocha.it)('has error class when invalid', function () {
            this.get('testObject.hasValidated').push('name');
            this.get('testObject.errors').add('name', 'has error');

            this.render(_ember['default'].HTMLBars.template((function () {
                var child0 = (function () {
                    return {
                        meta: {
                            'fragmentReason': false,
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 2,
                                    'column': 16
                                },
                                'end': {
                                    'line': 3,
                                    'column': 16
                                }
                            }
                        },
                        isEmpty: true,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes() {
                            return [];
                        },
                        statements: [],
                        locals: [],
                        templates: []
                    };
                })();

                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 4,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['block', 'gh-validation-status-container', [], ['class', 'gh-test', 'property', 'name', 'errors', ['subexpr', '@mut', [['get', 'testObject.errors', ['loc', [null, [2, 89], [2, 106]]]]], [], []], 'hasValidated', ['subexpr', '@mut', [['get', 'testObject.hasValidated', ['loc', [null, [2, 120], [2, 143]]]]], [], []]], 0, null, ['loc', [null, [2, 16], [3, 51]]]]],
                    locals: [],
                    templates: [child0]
                };
            })()));
            (0, _chai.expect)(this.$('.gh-test')).to.have.length(1);
            (0, _chai.expect)(this.$('.gh-test').hasClass('success')).to.be['false'];
            (0, _chai.expect)(this.$('.gh-test').hasClass('error')).to.be['true'];
        });

        (0, _emberMocha.it)('still renders if hasValidated is undefined', function () {
            this.set('testObject.hasValidated', undefined);

            this.render(_ember['default'].HTMLBars.template((function () {
                var child0 = (function () {
                    return {
                        meta: {
                            'fragmentReason': false,
                            'revision': 'Ember@2.5.1',
                            'loc': {
                                'source': null,
                                'start': {
                                    'line': 2,
                                    'column': 16
                                },
                                'end': {
                                    'line': 3,
                                    'column': 16
                                }
                            }
                        },
                        isEmpty: true,
                        arity: 0,
                        cachedFragment: null,
                        hasRendered: false,
                        buildFragment: function buildFragment(dom) {
                            var el0 = dom.createDocumentFragment();
                            return el0;
                        },
                        buildRenderNodes: function buildRenderNodes() {
                            return [];
                        },
                        statements: [],
                        locals: [],
                        templates: []
                    };
                })();

                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 4,
                                'column': 12
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createTextNode('\n');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        var el1 = dom.createTextNode('            ');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
                        return morphs;
                    },
                    statements: [['block', 'gh-validation-status-container', [], ['class', 'gh-test', 'property', 'name', 'errors', ['subexpr', '@mut', [['get', 'testObject.errors', ['loc', [null, [2, 89], [2, 106]]]]], [], []], 'hasValidated', ['subexpr', '@mut', [['get', 'testObject.hasValidated', ['loc', [null, [2, 120], [2, 143]]]]], [], []]], 0, null, ['loc', [null, [2, 16], [3, 51]]]]],
                    locals: [],
                    templates: [child0]
                };
            })()));
            (0, _chai.expect)(this.$('.gh-test')).to.have.length(1);
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/components/modals/delete-subscriber-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeComponent)('modals/delete-subscriber', 'Integration: Component: modals/delete-subscriber', {
        integration: true
    }, function () {
        (0, _emberMocha.it)('renders', function () {
            // Set any properties with this.set('myProperty', 'value');
            // Handle any actions with this.on('myAction', function(val) { ... });
            // Template block usage:
            // this.render(hbs`
            //   {{#modals/delete-subscriber}}
            //     template content
            //   {{/modals/delete-subscriber}}
            // `);

            this.render(Ember.HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 28
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['content', 'modals/delete-subscriber', ['loc', [null, [1, 0], [1, 28]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _chai.expect)(this.$()).to.have.length(1);
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/components/modals/import-subscribers-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeComponent)('modals/import-subscribers', 'Integration: Component: modals/import-subscribers', {
        integration: true
    }, function () {
        (0, _emberMocha.it)('renders', function () {
            // Set any properties with this.set('myProperty', 'value');
            // Handle any actions with this.on('myAction', function(val) { ... });
            // Template block usage:
            // this.render(hbs`
            //   {{#modals/import-subscribers}}
            //     template content
            //   {{/modals/import-subscribers}}
            // `);

            this.render(Ember.HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 29
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['content', 'modals/import-subscribers', ['loc', [null, [1, 0], [1, 29]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _chai.expect)(this.$()).to.have.length(1);
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/components/modals/new-subscriber-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeComponent)('modals/new-subscriber', 'Integration: Component: modals/new-subscriber', {
        integration: true
    }, function () {
        (0, _emberMocha.it)('renders', function () {
            // Set any properties with this.set('myProperty', 'value');
            // Handle any actions with this.on('myAction', function(val) { ... });
            // Template block usage:
            // this.render(hbs`
            //   {{#modals/new-subscriber}}
            //     template content
            //   {{/modals/new-subscriber}}
            // `);

            this.render(Ember.HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 25
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['content', 'modals/new-subscriber', ['loc', [null, [1, 0], [1, 25]]]]],
                    locals: [],
                    templates: []
                };
            })()));
            (0, _chai.expect)(this.$()).to.have.length(1);
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/components/transfer-owner-test', ['exports', 'chai', 'ember-mocha', 'ember', 'sinon'], function (exports, _chai, _emberMocha, _ember, _sinon) {
    var RSVP = _ember['default'].RSVP;
    var run = _ember['default'].run;

    (0, _emberMocha.describeComponent)('transfer-owner', 'Integration: Component: modals/transfer-owner', {
        integration: true
    }, function () {
        (0, _emberMocha.it)('triggers confirm action', function () {
            var _this = this;

            var confirm = _sinon['default'].stub();
            var closeModal = _sinon['default'].spy();

            confirm.returns(RSVP.resolve({}));

            this.on('confirm', confirm);
            this.on('closeModal', closeModal);

            this.render(_ember['default'].HTMLBars.template((function () {
                return {
                    meta: {
                        'fragmentReason': {
                            'name': 'missing-wrapper',
                            'problems': ['wrong-type']
                        },
                        'revision': 'Ember@2.5.1',
                        'loc': {
                            'source': null,
                            'start': {
                                'line': 1,
                                'column': 0
                            },
                            'end': {
                                'line': 1,
                                'column': 85
                            }
                        }
                    },
                    isEmpty: false,
                    arity: 0,
                    cachedFragment: null,
                    hasRendered: false,
                    buildFragment: function buildFragment(dom) {
                        var el0 = dom.createDocumentFragment();
                        var el1 = dom.createComment('');
                        dom.appendChild(el0, el1);
                        return el0;
                    },
                    buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
                        var morphs = new Array(1);
                        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
                        dom.insertBoundary(fragment, 0);
                        dom.insertBoundary(fragment, null);
                        return morphs;
                    },
                    statements: [['inline', 'modals/transfer-owner', [], ['confirm', ['subexpr', 'action', ['confirm'], [], ['loc', [null, [1, 32], [1, 50]]]], 'closeModal', ['subexpr', 'action', ['closeModal'], [], ['loc', [null, [1, 62], [1, 83]]]]], ['loc', [null, [1, 0], [1, 85]]]]],
                    locals: [],
                    templates: []
                };
            })()));

            run(function () {
                _this.$('.btn.btn-red').click();
            });

            (0, _chai.expect)(confirm.calledOnce, 'confirm called').to.be['true'];
            (0, _chai.expect)(closeModal.calledOnce, 'closeModal called').to.be['true'];
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/integration/services/ajax-test', ['exports', 'chai', 'ember-mocha', 'pretender', 'ember-ajax/errors', 'ghost-admin/services/ajax', 'ghost-admin/config/environment'], function (exports, _chai, _emberMocha, _pretender, _emberAjaxErrors, _ghostAdminServicesAjax, _ghostAdminConfigEnvironment) {
    var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

    function stubAjaxEndpoint(server) {
        var response = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
        var code = arguments.length <= 2 || arguments[2] === undefined ? 200 : arguments[2];

        server.get('/test/', function () {
            return [code, { 'Content-Type': 'application/json' }, JSON.stringify(response)];
        });
    }

    (0, _emberMocha.describeModule)('service:ajax', 'Integration: Service: ajax', {
        integration: true
    }, function () {
        var server = undefined;

        beforeEach(function () {
            server = new _pretender['default']();
        });

        afterEach(function () {
            server.shutdown();
        });

        (0, _emberMocha.it)('adds Ghost version header to requests', function (done) {
            var version = _ghostAdminConfigEnvironment['default'].APP.version;

            var ajax = this.subject();

            stubAjaxEndpoint(server, {});

            ajax.request('/test/').then(function () {
                var _server$handledRequests = _slicedToArray(server.handledRequests, 1);

                var request = _server$handledRequests[0];

                (0, _chai.expect)(request.requestHeaders['X-Ghost-Version']).to.equal(version);
                done();
            });
        });

        (0, _emberMocha.it)('correctly parses single message response text', function (done) {
            var error = { message: 'Test Error' };
            stubAjaxEndpoint(server, error, 500);

            var ajax = this.subject();

            ajax.request('/test/').then(function () {
                (0, _chai.expect)(false).to.be['true']();
            })['catch'](function (error) {
                (0, _chai.expect)(error.errors).to.equal('Test Error');
                done();
            });
        });

        (0, _emberMocha.it)('correctly parses single error response text', function (done) {
            var error = { error: 'Test Error' };
            stubAjaxEndpoint(server, error, 500);

            var ajax = this.subject();

            ajax.request('/test/').then(function () {
                (0, _chai.expect)(false).to.be['true']();
            })['catch'](function (error) {
                (0, _chai.expect)(error.errors).to.equal('Test Error');
                done();
            });
        });

        (0, _emberMocha.it)('correctly parses multiple error messages', function (done) {
            var error = { errors: ['First Error', 'Second Error'] };
            stubAjaxEndpoint(server, error, 500);

            var ajax = this.subject();

            ajax.request('/test/').then(function () {
                (0, _chai.expect)(false).to.be['true']();
            })['catch'](function (error) {
                (0, _chai.expect)(error.errors).to.deep.equal(['First Error', 'Second Error']);
                done();
            });
        });

        (0, _emberMocha.it)('returns default error object for non built-in error', function (done) {
            stubAjaxEndpoint(server, {}, 500);

            var ajax = this.subject();

            ajax.request('/test/').then(function () {
                (0, _chai.expect)(false).to.be['true'];
            })['catch'](function (error) {
                (0, _chai.expect)(error).to.be.instanceOf(_emberAjaxErrors.AjaxError);
                done();
            });
        });

        (0, _emberMocha.it)('returns known error object for built-in errors', function (done) {
            stubAjaxEndpoint(server, '', 401);

            var ajax = this.subject();

            ajax.request('/test/').then(function () {
                (0, _chai.expect)(false).to.be['true'];
            })['catch'](function (error) {
                (0, _chai.expect)(error).to.be.instanceOf(_emberAjaxErrors.UnauthorizedError);
                done();
            });
        });

        (0, _emberMocha.it)('returns RequestEntityTooLargeError object for 413 errors', function (done) {
            stubAjaxEndpoint(server, {}, 413);

            var ajax = this.subject();

            ajax.request('/test/').then(function () {
                (0, _chai.expect)(false).to.be['true'];
            })['catch'](function (error) {
                (0, _chai.expect)(error).to.be.instanceOf(_ghostAdminServicesAjax.RequestEntityTooLargeError);
                done();
            });
        });

        (0, _emberMocha.it)('returns UnsupportedMediaTypeError object for 415 errors', function (done) {
            stubAjaxEndpoint(server, {}, 415);

            var ajax = this.subject();

            ajax.request('/test/').then(function () {
                (0, _chai.expect)(false).to.be['true'];
            })['catch'](function (error) {
                (0, _chai.expect)(error).to.be.instanceOf(_ghostAdminServicesAjax.UnsupportedMediaTypeError);
                done();
            });
        });
    });
});
define('ghost-admin/tests/integration/services/config-test', ['exports', 'chai', 'ember-mocha', 'pretender', 'ember'], function (exports, _chai, _emberMocha, _pretender, _ember) {

    function stubAvailableTimezonesEndpoint(server) {
        server.get('/ghost/api/v0.1/configuration/timezones', function (request) {
            return [200, { 'Content-Type': 'application/json' }, JSON.stringify({
                configuration: [{
                    timezones: [{
                        label: '(GMT -11:00) Midway Island, Samoa',
                        name: 'Pacific/Pago_Pago',
                        offset: -660
                    }, {
                        label: '(GMT) Greenwich Mean Time : Dublin, Edinburgh, London',
                        name: 'Europe/Dublin',
                        offset: 0
                    }]
                }]
            })];
        });
    }

    (0, _emberMocha.describeModule)('service:config', 'Integration: Service: config', {
        integration: true
    }, function () {
        var server = undefined;

        beforeEach(function () {
            server = new _pretender['default']();
        });

        afterEach(function () {
            server.shutdown();
        });

        (0, _emberMocha.it)('returns a list of timezones in the expected format', function (done) {
            var service = this.subject();
            stubAvailableTimezonesEndpoint(server);

            service.get('availableTimezones').then(function (timezones) {
                (0, _chai.expect)(timezones.length).to.equal(2);
                (0, _chai.expect)(timezones[0].name).to.equal('Pacific/Pago_Pago');
                (0, _chai.expect)(timezones[0].label).to.equal('(GMT -11:00) Midway Island, Samoa');
                (0, _chai.expect)(timezones[1].name).to.equal('Europe/Dublin');
                (0, _chai.expect)(timezones[1].label).to.equal('(GMT) Greenwich Mean Time : Dublin, Edinburgh, London');
                done();
            });
        });
    });
});
define('ghost-admin/tests/integration/services/feature-test', ['exports', 'ember-mocha', 'pretender', 'ember-test-helpers/wait', 'ghost-admin/services/feature', 'ember', 'ghost-admin/tests/helpers/adapter-error'], function (exports, _emberMocha, _pretender, _emberTestHelpersWait, _ghostAdminServicesFeature, _ember, _ghostAdminTestsHelpersAdapterError) {
    var RSVP = _ember['default'].RSVP;
    var merge = _ember['default'].merge;
    var run = _ember['default'].run;

    var EmberError = _ember['default'].Error;

    function stubSettings(server, labs) {
        var validSave = arguments.length <= 2 || arguments[2] === undefined ? true : arguments[2];
        var validSettings = arguments.length <= 3 || arguments[3] === undefined ? true : arguments[3];

        var settings = [{
            id: '1',
            type: 'blog',
            key: 'labs',
            value: JSON.stringify(labs)
        }];

        if (validSettings) {
            settings.push({
                id: '2',
                type: 'blog',
                key: 'postsPerPage',
                value: 1
            });
        }

        server.get('/ghost/api/v0.1/settings/', function () {
            return [200, { 'Content-Type': 'application/json' }, JSON.stringify({ settings: settings })];
        });

        server.put('/ghost/api/v0.1/settings/', function (request) {
            var statusCode = validSave ? 200 : 400;
            var response = validSave ? request.requestBody : JSON.stringify({
                errors: [{
                    message: 'Test Error'
                }]
            });

            return [statusCode, { 'Content-Type': 'application/json' }, response];
        });
    }

    function addTestFlag() {
        _ghostAdminServicesFeature['default'].reopen({
            testFlag: (0, _ghostAdminServicesFeature.feature)('testFlag')
        });
    }

    (0, _emberMocha.describeModule)('service:feature', 'Integration: Service: feature', {
        integration: true
    }, function () {
        var server = undefined;

        beforeEach(function () {
            server = new _pretender['default']();
        });

        afterEach(function () {
            server.shutdown();
        });

        (0, _emberMocha.it)('loads labs settings correctly', function (done) {
            stubSettings(server, { testFlag: true });
            addTestFlag();

            var service = this.subject();

            service.fetch().then(function () {
                expect(service.get('testFlag')).to.be['true'];
                done();
            });
        });

        (0, _emberMocha.it)('returns false for set flag with config false and labs false', function (done) {
            stubSettings(server, { testFlag: false });
            addTestFlag();

            var service = this.subject();
            service.get('config').set('testFlag', false);

            service.fetch().then(function () {
                expect(service.get('labs.testFlag')).to.be['false'];
                expect(service.get('testFlag')).to.be['false'];
                done();
            });
        });

        (0, _emberMocha.it)('returns true for set flag with config true and labs false', function (done) {
            stubSettings(server, { testFlag: false });
            addTestFlag();

            var service = this.subject();
            service.get('config').set('testFlag', true);

            service.fetch().then(function () {
                expect(service.get('labs.testFlag')).to.be['false'];
                expect(service.get('testFlag')).to.be['true'];
                done();
            });
        });

        (0, _emberMocha.it)('returns true for set flag with config false and labs true', function (done) {
            stubSettings(server, { testFlag: true });
            addTestFlag();

            var service = this.subject();
            service.get('config').set('testFlag', false);

            service.fetch().then(function () {
                expect(service.get('labs.testFlag')).to.be['true'];
                expect(service.get('testFlag')).to.be['true'];
                done();
            });
        });

        (0, _emberMocha.it)('returns true for set flag with config true and labs true', function (done) {
            stubSettings(server, { testFlag: true });
            addTestFlag();

            var service = this.subject();
            service.get('config').set('testFlag', true);

            service.fetch().then(function () {
                expect(service.get('labs.testFlag')).to.be['true'];
                expect(service.get('testFlag')).to.be['true'];
                done();
            });
        });

        (0, _emberMocha.it)('saves correctly', function (done) {
            stubSettings(server, { testFlag: false });
            addTestFlag();

            var service = this.subject();

            service.fetch().then(function () {
                expect(service.get('testFlag')).to.be['false'];

                run(function () {
                    service.set('testFlag', true);
                });

                return (0, _emberTestHelpersWait['default'])().then(function () {
                    expect(server.handlers[1].numberOfCalls).to.equal(1);
                    expect(service.get('testFlag')).to.be['true'];
                    done();
                });
            });
        });

        (0, _emberMocha.it)('notifies for server errors', function (done) {
            stubSettings(server, { testFlag: false }, false);
            addTestFlag();

            var service = this.subject();

            service.fetch().then(function () {
                expect(service.get('testFlag')).to.be['false'];

                run(function () {
                    service.set('testFlag', true);
                });

                return (0, _emberTestHelpersWait['default'])().then(function () {
                    expect(server.handlers[1].numberOfCalls).to.equal(1);
                    expect(service.get('notifications.notifications').length).to.equal(1);
                    expect(service.get('testFlag')).to.be['false'];
                    done();
                });
            });
        });

        (0, _emberMocha.it)('notifies for validation errors', function (done) {
            stubSettings(server, { testFlag: false }, true, false);
            addTestFlag();

            var service = this.subject();

            service.fetch().then(function () {
                expect(service.get('testFlag')).to.be['false'];

                run(function () {
                    expect(function () {
                        service.set('testFlag', true);
                    }, EmberError, 'threw validation error');
                });

                return (0, _emberTestHelpersWait['default'])().then(function () {
                    // ensure validation is happening before the API is hit
                    expect(server.handlers[1].numberOfCalls).to.equal(0);
                    expect(service.get('testFlag')).to.be['false'];
                    done();
                });
            });
        });
    });
});
define('ghost-admin/tests/integration/services/slug-generator-test', ['exports', 'chai', 'ember-mocha', 'pretender', 'ember'], function (exports, _chai, _emberMocha, _pretender, _ember) {
    var dasherize = _ember['default'].String.dasherize;

    function stubSlugEndpoint(server, type, slug) {
        server.get('/ghost/api/v0.1/slugs/:type/:slug/', function (request) {
            (0, _chai.expect)(request.params.type).to.equal(type);
            (0, _chai.expect)(request.params.slug).to.equal(slug);

            return [200, { 'Content-Type': 'application/json' }, JSON.stringify({ slugs: [{ slug: dasherize(slug) }] })];
        });
    }

    (0, _emberMocha.describeModule)('service:slug-generator', 'Integration: Service: slug-generator', {
        integration: true
    }, function () {
        var server = undefined;

        beforeEach(function () {
            server = new _pretender['default']();
        });

        afterEach(function () {
            server.shutdown();
        });

        (0, _emberMocha.it)('returns empty if no slug is provided', function (done) {
            var service = this.subject();

            service.generateSlug('post', '').then(function (slug) {
                (0, _chai.expect)(slug).to.equal('');
                done();
            });
        });

        (0, _emberMocha.it)('calls correct endpoint and returns correct data', function (done) {
            var rawSlug = 'a test post';
            stubSlugEndpoint(server, 'post', rawSlug);

            var service = this.subject();

            service.generateSlug('post', rawSlug).then(function (slug) {
                (0, _chai.expect)(slug).to.equal(dasherize(rawSlug));
                done();
            });
        });
    });
});
define('ghost-admin/tests/integration/services/store-test', ['exports', 'chai', 'ember-mocha', 'pretender', 'ghost-admin/config/environment'], function (exports, _chai, _emberMocha, _pretender, _ghostAdminConfigEnvironment) {
    var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

    (0, _emberMocha.describeModule)('service:store', 'Integration: Service: store', {
        integration: true
    }, function () {
        var server = undefined;

        beforeEach(function () {
            server = new _pretender['default']();
        });

        afterEach(function () {
            server.shutdown();
        });

        (0, _emberMocha.it)('adds Ghost version header to requests', function (done) {
            var version = _ghostAdminConfigEnvironment['default'].APP.version;

            var store = this.subject();

            server.get('/ghost/api/v0.1/posts/1/', function () {
                return [404, { 'Content-Type': 'application/json' }, JSON.stringify({})];
            });

            store.find('post', 1)['catch'](function () {
                var _server$handledRequests = _slicedToArray(server.handledRequests, 1);

                var request = _server$handledRequests[0];

                (0, _chai.expect)(request.requestHeaders['X-Ghost-Version']).to.equal(version);
                done();
            });
        });
    });
});
define('ghost-admin/tests/integration/services/time-zone-test', ['exports', 'chai', 'ember-mocha', 'pretender', 'ember'], function (exports, _chai, _emberMocha, _pretender, _ember) {

    function settingsStub(server) {
        var settings = [{
            id: '1',
            type: 'blog',
            key: 'activeTimezone',
            value: 'Africa/Cairo'
        }];

        server.get('/ghost/api/v0.1/settings/', function () {
            return [200, { 'Content-Type': 'application/json' }, JSON.stringify({ settings: settings })];
        });
    }

    (0, _emberMocha.describeModule)('service:time-zone', 'Integration: Service: time-zone', {
        integration: true
    }, function () {
        var server = undefined;

        beforeEach(function () {
            server = new _pretender['default']();
        });

        afterEach(function () {
            server.shutdown();
        });

        (0, _emberMocha.it)('should return a timezone offset', function (done) {
            var service = this.subject();

            settingsStub(server);

            service.get('offset').then(function (offset) {
                (0, _chai.expect)(offset).to.equal('Africa/Cairo');
                done();
            });
        });
    });
});
define('ghost-admin/tests/test-helper', ['exports', 'ghost-admin/tests/helpers/resolver', 'ember-mocha'], function (exports, _ghostAdminTestsHelpersResolver, _emberMocha) {

    (0, _emberMocha.setResolver)(_ghostAdminTestsHelpersResolver['default']);

    /* jshint ignore:start */
    mocha.setup({
        timeout: 15000,
        slow: 500
    });
    /* jshint ignore:end */
});
define('ghost-admin/tests/unit/components/gh-alert-test', ['exports', 'chai', 'ember-mocha', 'sinon'], function (exports, _chai, _emberMocha, _sinon) {

    (0, _emberMocha.describeComponent)('gh-alert', 'Unit: Component: gh-alert', {
        unit: true
        // specify the other units that are required for this test
        // needs: ['component:foo', 'helper:bar']
    }, function () {
        (0, _emberMocha.it)('closes notification through notifications service', function () {
            var component = this.subject();
            var notifications = {};
            var notification = { message: 'Test close', type: 'success' };

            notifications.closeNotification = _sinon['default'].spy();
            component.set('notifications', notifications);
            component.set('message', notification);

            this.$().find('button').click();

            (0, _chai.expect)(notifications.closeNotification.calledWith(notification)).to.be['true'];
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/components/gh-app-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeComponent)('gh-app', 'Unit: Component: gh-app', {
        unit: true
        // specify the other units that are required for this test
        // needs: ['component:foo', 'helper:bar']
    }, function () {
        (0, _emberMocha.it)('renders', function () {
            // creates the component instance
            var component = this.subject();

            (0, _chai.expect)(component._state).to.equal('preRender');

            // renders the component on the page
            this.render();
            (0, _chai.expect)(component._state).to.equal('inDOM');
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/components/gh-content-preview-content-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeComponent)('gh-content-preview-content', 'Unit: Component: gh-content-preview-content', {
        unit: true
        // specify the other units that are required for this test
        // needs: ['component:foo', 'helper:bar']
    }, function () {
        (0, _emberMocha.it)('renders', function () {
            // creates the component instance
            var component = this.subject();

            (0, _chai.expect)(component._state).to.equal('preRender');

            // renders the component on the page
            this.render();
            (0, _chai.expect)(component._state).to.equal('inDOM');
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/components/gh-editor-save-button-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeComponent)('gh-editor-save-button', 'Unit: Component: gh-editor-save-button', {
        unit: true,
        needs: ['component:gh-dropdown-button', 'component:gh-dropdown', 'component:gh-spin-button', 'service:dropdown']
    }, function () {
        (0, _emberMocha.it)('renders', function () {
            // creates the component instance
            var component = this.subject();

            (0, _chai.expect)(component._state).to.equal('preRender');

            // renders the component on the page
            this.render();
            (0, _chai.expect)(component._state).to.equal('inDOM');
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/components/gh-editor-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeComponent)('gh-editor', 'Unit: Component: gh-editor', {
        unit: true,
        // specify the other units that are required for this test
        needs: ['component:gh-ed-editor', 'component:gh-ed-preview', 'helper:gh-count-words', 'helper:route-action', 'service:notifications']
    }, function () {
        (0, _emberMocha.it)('renders', function () {
            // creates the component instance
            var component = this.subject();

            (0, _chai.expect)(component._state).to.equal('preRender');

            // renders the component on the page
            this.render();
            (0, _chai.expect)(component._state).to.equal('inDOM');
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/components/gh-infinite-scroll-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeComponent)('gh-infinite-scroll', 'Unit: Component: gh-infinite-scroll', {
        unit: true
        // specify the other units that are required for this test
        // needs: ['component:foo', 'helper:bar']
    }, function () {
        (0, _emberMocha.it)('renders', function () {
            // creates the component instance
            var component = this.subject();

            (0, _chai.expect)(component._state).to.equal('preRender');

            // renders the component on the page
            this.render();
            (0, _chai.expect)(component._state).to.equal('inDOM');
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/components/gh-navitem-url-input-test', ['exports', 'ember', 'chai', 'ember-mocha'], function (exports, _ember, _chai, _emberMocha) {
    var run = _ember['default'].run;

    (0, _emberMocha.describeComponent)('gh-navitem-url-input', 'Unit: Component: gh-navitem-url-input', {
        unit: true
    }, function () {
        (0, _emberMocha.it)('identifies a URL as the base URL', function () {
            var component = this.subject({
                url: '',
                baseUrl: 'http://example.com/'
            });

            this.render();

            run(function () {
                component.set('value', 'http://example.com/');
            });

            (0, _chai.expect)(component.get('isBaseUrl')).to.be.ok;

            run(function () {
                component.set('value', 'http://example.com/go/');
            });

            (0, _chai.expect)(component.get('isBaseUrl')).to.not.be.ok;
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/components/gh-notification-test', ['exports', 'chai', 'ember-mocha', 'sinon'], function (exports, _chai, _emberMocha, _sinon) {

    (0, _emberMocha.describeComponent)('gh-notification', 'Unit: Component: gh-notification', {
        unit: true
        // specify the other units that are required for this test
        // needs: ['component:foo', 'helper:bar']
    }, function () {
        (0, _emberMocha.it)('closes notification through notifications service', function () {
            var component = this.subject();
            var notifications = {};
            var notification = { message: 'Test close', type: 'success' };

            notifications.closeNotification = _sinon['default'].spy();
            component.set('notifications', notifications);
            component.set('message', notification);

            this.$().find('button').click();

            (0, _chai.expect)(notifications.closeNotification.calledWith(notification)).to.be['true'];
        });

        (0, _emberMocha.it)('closes notification when animationend event is triggered', function (done) {
            var component = this.subject();
            var notifications = {};
            var notification = { message: 'Test close', type: 'success' };

            notifications.closeNotification = _sinon['default'].spy();
            component.set('notifications', notifications);
            component.set('message', notification);

            // shorten the animation delay to speed up test
            this.$().css('animation-delay', '0.1s');
            setTimeout(function () {
                (0, _chai.expect)(notifications.closeNotification.calledWith(notification)).to.be['true'];
                done();
            }, 150);
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/components/gh-posts-list-item-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeComponent)('gh-posts-list-item', 'Unit: Component: gh-posts-list-item', {
        unit: true
        // specify the other units that are required for this test
        // needs: ['component:foo', 'helper:bar']
    }, function () {
        (0, _emberMocha.it)('renders', function () {
            // creates the component instance
            var component = this.subject();

            (0, _chai.expect)(component._state).to.equal('preRender');

            // renders the component on the page
            this.render();
            (0, _chai.expect)(component._state).to.equal('inDOM');
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/components/gh-select-native-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeComponent)('gh-select-native', 'Unit: Component: gh-select-native', {
        unit: true
        // specify the other units that are required for this test
        // needs: ['component:foo', 'helper:bar']
    }, function () {
        (0, _emberMocha.it)('renders', function () {
            // creates the component instance
            var component = this.subject();

            (0, _chai.expect)(component._state).to.equal('preRender');

            // renders the component on the page
            this.render();
            (0, _chai.expect)(component._state).to.equal('inDOM');
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/components/gh-selectize-test', ['exports', 'chai', 'ember-mocha', 'ember'], function (exports, _chai, _emberMocha, _ember) {
    var run = _ember['default'].run;

    var emberA = _ember['default'].A;

    (0, _emberMocha.describeComponent)('gh-selectize', 'Unit: Component: gh-selectize', {
        // Specify the other units that are required for this test
        // needs: ['component:foo', 'helper:bar'],
        unit: true
    }, function () {
        (0, _emberMocha.it)('re-orders selection when selectize order is changed', function () {
            var component = this.subject();

            run(function () {
                component.set('content', emberA(['item 1', 'item 2', 'item 3']));
                component.set('selection', emberA(['item 2', 'item 3']));
                component.set('multiple', true);
            });

            this.render();

            run(function () {
                component._selectize.setValue(['item 3', 'item 2']);
            });

            (0, _chai.expect)(component.get('value'), 'component value').to.deep.equal(['item 3', 'item 2']);
            (0, _chai.expect)(component.get('selection'), 'component selection').to.deep.equal(['item 3', 'item 2']);
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/components/gh-spin-button-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeComponent)('gh-spin-button', 'Unit: Component: gh-spin-button', {
        unit: true
        // specify the other units that are required for this test
        // needs: ['component:foo', 'helper:bar']
    }, function () {
        (0, _emberMocha.it)('renders', function () {
            // creates the component instance
            var component = this.subject();

            (0, _chai.expect)(component._state).to.equal('preRender');

            // renders the component on the page
            this.render();
            (0, _chai.expect)(component._state).to.equal('inDOM');
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/components/gh-trim-focus-input_test', ['exports', 'ember', 'ember-mocha'], function (exports, _ember, _emberMocha) {

    (0, _emberMocha.describeComponent)('gh-trim-focus-input', 'Unit: Component: gh-trim-focus-input', {
        unit: true
    }, function () {
        (0, _emberMocha.it)('trims value on focusOut', function () {
            var component = this.subject({
                value: 'some random stuff   '
            });

            this.render();

            component.$().focusout();
            expect(component.$().val()).to.equal('some random stuff');
        });

        (0, _emberMocha.it)('does not have the autofocus attribute if not set to focus', function () {
            var component = this.subject({
                value: 'some text',
                focus: false
            });

            this.render();

            expect(component.$().attr('autofocus')).to.not.be.ok;
        });

        (0, _emberMocha.it)('has the autofocus attribute if set to focus', function () {
            var component = this.subject({
                value: 'some text',
                focus: true
            });

            this.render();

            expect(component.$().attr('autofocus')).to.be.ok;
        });
    });
});
define('ghost-admin/tests/unit/components/gh-url-preview_test', ['exports', 'ember-mocha'], function (exports, _emberMocha) {

    (0, _emberMocha.describeComponent)('gh-url-preview', 'Unit: Component: gh-url-preview', {
        unit: true
    }, function () {
        (0, _emberMocha.it)('generates the correct preview URL with a prefix', function () {
            var component = this.subject({
                prefix: 'tag',
                slug: 'test-slug',
                tagName: 'p',
                classNames: 'test-class',

                config: { blogUrl: 'http://my-ghost-blog.com' }
            });

            this.render();

            expect(component.get('url')).to.equal('my-ghost-blog.com/tag/test-slug/');
        });

        (0, _emberMocha.it)('generates the correct preview URL without a prefix', function () {
            var component = this.subject({
                slug: 'test-slug',
                tagName: 'p',
                classNames: 'test-class',

                config: { blogUrl: 'http://my-ghost-blog.com' }
            });

            this.render();

            expect(component.get('url')).to.equal('my-ghost-blog.com/test-slug/');
        });
    });
});
define('ghost-admin/tests/unit/components/gh-user-active-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeComponent)('gh-user-active', 'Unit: Component: gh-user-active', {
        unit: true
        // specify the other units that are required for this test
        // needs: ['component:foo', 'helper:bar']
    }, function () {
        (0, _emberMocha.it)('renders', function () {
            // creates the component instance
            var component = this.subject();

            (0, _chai.expect)(component._state).to.equal('preRender');

            // renders the component on the page
            this.render();
            (0, _chai.expect)(component._state).to.equal('inDOM');
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/components/gh-user-invited-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeComponent)('gh-user-invited', 'Unit: Component: gh-user-invited', {
        unit: true
        // specify the other units that are required for this test
        // needs: ['component:foo', 'helper:bar']
    }, function () {
        (0, _emberMocha.it)('renders', function () {
            // creates the component instance
            var component = this.subject();

            (0, _chai.expect)(component._state).to.equal('preRender');

            // renders the component on the page
            this.render();
            (0, _chai.expect)(component._state).to.equal('inDOM');
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/controllers/post-settings-menu-test', ['exports', 'ember', 'ember-mocha', 'sinon'], function (exports, _ember, _emberMocha, _sinon) {
    var run = _ember['default'].run;

    function K() {
        return this;
    }

    (0, _emberMocha.describeModule)('controller:post-settings-menu', 'Unit: Controller: post-settings-menu', {
        needs: ['controller:application', 'service:notifications', 'service:slug-generator', 'service:timeZone']
    }, function () {
        (0, _emberMocha.it)('slugValue is one-way bound to model.slug', function () {
            var controller = this.subject({
                model: _ember['default'].Object.create({
                    slug: 'a-slug'
                })
            });

            expect(controller.get('model.slug')).to.equal('a-slug');
            expect(controller.get('slugValue')).to.equal('a-slug');

            run(function () {
                controller.set('model.slug', 'changed-slug');

                expect(controller.get('slugValue')).to.equal('changed-slug');
            });

            run(function () {
                controller.set('slugValue', 'changed-directly');

                expect(controller.get('model.slug')).to.equal('changed-slug');
                expect(controller.get('slugValue')).to.equal('changed-directly');
            });

            run(function () {
                // test that the one-way binding is still in place
                controller.set('model.slug', 'should-update');

                expect(controller.get('slugValue')).to.equal('should-update');
            });
        });

        (0, _emberMocha.it)('metaTitleScratch is one-way bound to model.metaTitle', function () {
            var controller = this.subject({
                model: _ember['default'].Object.create({
                    metaTitle: 'a title'
                })
            });

            expect(controller.get('model.metaTitle')).to.equal('a title');
            expect(controller.get('metaTitleScratch')).to.equal('a title');

            run(function () {
                controller.set('model.metaTitle', 'a different title');

                expect(controller.get('metaTitleScratch')).to.equal('a different title');
            });

            run(function () {
                controller.set('metaTitleScratch', 'changed directly');

                expect(controller.get('model.metaTitle')).to.equal('a different title');
                expect(controller.get('metaTitleScratch')).to.equal('changed directly');
            });

            run(function () {
                // test that the one-way binding is still in place
                controller.set('model.metaTitle', 'should update');

                expect(controller.get('metaTitleScratch')).to.equal('should update');
            });
        });

        (0, _emberMocha.it)('metaDescriptionScratch is one-way bound to model.metaDescription', function () {
            var controller = this.subject({
                model: _ember['default'].Object.create({
                    metaDescription: 'a description'
                })
            });

            expect(controller.get('model.metaDescription')).to.equal('a description');
            expect(controller.get('metaDescriptionScratch')).to.equal('a description');

            run(function () {
                controller.set('model.metaDescription', 'a different description');

                expect(controller.get('metaDescriptionScratch')).to.equal('a different description');
            });

            run(function () {
                controller.set('metaDescriptionScratch', 'changed directly');

                expect(controller.get('model.metaDescription')).to.equal('a different description');
                expect(controller.get('metaDescriptionScratch')).to.equal('changed directly');
            });

            run(function () {
                // test that the one-way binding is still in place
                controller.set('model.metaDescription', 'should update');

                expect(controller.get('metaDescriptionScratch')).to.equal('should update');
            });
        });

        describe('seoTitle', function () {
            (0, _emberMocha.it)('should be the metaTitle if one exists', function () {
                var controller = this.subject({
                    model: _ember['default'].Object.create({
                        metaTitle: 'a meta-title',
                        titleScratch: 'should not be used'
                    })
                });

                expect(controller.get('seoTitle')).to.equal('a meta-title');
            });

            (0, _emberMocha.it)('should default to the title if an explicit meta-title does not exist', function () {
                var controller = this.subject({
                    model: _ember['default'].Object.create({
                        titleScratch: 'should be the meta-title'
                    })
                });

                expect(controller.get('seoTitle')).to.equal('should be the meta-title');
            });

            (0, _emberMocha.it)('should be the metaTitle if both title and metaTitle exist', function () {
                var controller = this.subject({
                    model: _ember['default'].Object.create({
                        metaTitle: 'a meta-title',
                        titleScratch: 'a title'
                    })
                });

                expect(controller.get('seoTitle')).to.equal('a meta-title');
            });

            (0, _emberMocha.it)('should revert to the title if explicit metaTitle is removed', function () {
                var controller = this.subject({
                    model: _ember['default'].Object.create({
                        metaTitle: 'a meta-title',
                        titleScratch: 'a title'
                    })
                });

                expect(controller.get('seoTitle')).to.equal('a meta-title');

                run(function () {
                    controller.set('model.metaTitle', '');

                    expect(controller.get('seoTitle')).to.equal('a title');
                });
            });

            (0, _emberMocha.it)('should truncate to 70 characters with an appended ellipsis', function () {
                var longTitle = new Array(100).join('a');
                var controller = this.subject({
                    model: _ember['default'].Object.create()
                });

                expect(longTitle.length).to.equal(99);

                run(function () {
                    var expected = longTitle.substr(0, 70) + '&hellip;';

                    controller.set('metaTitleScratch', longTitle);

                    expect(controller.get('seoTitle').toString().length).to.equal(78);
                    expect(controller.get('seoTitle').toString()).to.equal(expected);
                });
            });
        });

        describe('seoDescription', function () {
            (0, _emberMocha.it)('should be the metaDescription if one exists', function () {
                var controller = this.subject({
                    model: _ember['default'].Object.create({
                        metaDescription: 'a description'
                    })
                });

                expect(controller.get('seoDescription')).to.equal('a description');
            });

            _emberMocha.it.skip('should be generated from the rendered markdown if not explicitly set', function () {
                // can't test right now because the rendered markdown is being pulled
                // from the DOM via jquery
            });

            (0, _emberMocha.it)('should truncate to 156 characters with an appended ellipsis', function () {
                var longDescription = new Array(200).join('a');
                var controller = this.subject({
                    model: _ember['default'].Object.create()
                });

                expect(longDescription.length).to.equal(199);

                run(function () {
                    var expected = longDescription.substr(0, 156) + '&hellip;';

                    controller.set('metaDescriptionScratch', longDescription);

                    expect(controller.get('seoDescription').toString().length).to.equal(164);
                    expect(controller.get('seoDescription').toString()).to.equal(expected);
                });
            });
        });

        describe('seoURL', function () {
            (0, _emberMocha.it)('should be the URL of the blog if no post slug exists', function () {
                var controller = this.subject({
                    config: _ember['default'].Object.create({ blogUrl: 'http://my-ghost-blog.com' }),
                    model: _ember['default'].Object.create()
                });

                expect(controller.get('seoURL')).to.equal('http://my-ghost-blog.com/');
            });

            (0, _emberMocha.it)('should be the URL of the blog plus the post slug', function () {
                var controller = this.subject({
                    config: _ember['default'].Object.create({ blogUrl: 'http://my-ghost-blog.com' }),
                    model: _ember['default'].Object.create({ slug: 'post-slug' })
                });

                expect(controller.get('seoURL')).to.equal('http://my-ghost-blog.com/post-slug/');
            });

            (0, _emberMocha.it)('should update when the post slug changes', function () {
                var controller = this.subject({
                    config: _ember['default'].Object.create({ blogUrl: 'http://my-ghost-blog.com' }),
                    model: _ember['default'].Object.create({ slug: 'post-slug' })
                });

                expect(controller.get('seoURL')).to.equal('http://my-ghost-blog.com/post-slug/');

                run(function () {
                    controller.set('model.slug', 'changed-slug');

                    expect(controller.get('seoURL')).to.equal('http://my-ghost-blog.com/changed-slug/');
                });
            });

            (0, _emberMocha.it)('should truncate a long URL to 70 characters with an appended ellipsis', function () {
                var blogURL = 'http://my-ghost-blog.com';
                var longSlug = new Array(75).join('a');
                var controller = this.subject({
                    config: _ember['default'].Object.create({ blogUrl: blogURL }),
                    model: _ember['default'].Object.create({ slug: longSlug })
                });
                var expected = undefined;

                expect(longSlug.length).to.equal(74);

                expected = blogURL + '/' + longSlug + '/';
                expected = expected.substr(0, 70) + '&hellip;';

                expect(controller.get('seoURL').toString().length).to.equal(78);
                expect(controller.get('seoURL').toString()).to.equal(expected);
            });
        });

        describe('togglePage', function () {
            (0, _emberMocha.it)('should toggle the page property', function () {
                var controller = this.subject({
                    model: _ember['default'].Object.create({
                        page: false,
                        isNew: true
                    })
                });

                expect(controller.get('model.page')).to.not.be.ok;

                run(function () {
                    controller.send('togglePage');

                    expect(controller.get('model.page')).to.be.ok;
                });
            });

            (0, _emberMocha.it)('should not save the post if it is still new', function () {
                var controller = this.subject({
                    model: _ember['default'].Object.create({
                        page: false,
                        isNew: true,
                        save: function save() {
                            this.incrementProperty('saved');
                            return _ember['default'].RSVP.resolve();
                        }
                    })
                });

                run(function () {
                    controller.send('togglePage');

                    expect(controller.get('model.page')).to.be.ok;
                    expect(controller.get('model.saved')).to.not.be.ok;
                });
            });

            (0, _emberMocha.it)('should save the post if it is not new', function () {
                var controller = this.subject({
                    model: _ember['default'].Object.create({
                        page: false,
                        isNew: false,
                        save: function save() {
                            this.incrementProperty('saved');
                            return _ember['default'].RSVP.resolve();
                        }
                    })
                });

                run(function () {
                    controller.send('togglePage');

                    expect(controller.get('model.page')).to.be.ok;
                    expect(controller.get('model.saved')).to.equal(1);
                });
            });
        });

        describe('toggleFeatured', function () {
            (0, _emberMocha.it)('should toggle the featured property', function () {
                var controller = this.subject({
                    model: _ember['default'].Object.create({
                        featured: false,
                        isNew: true
                    })
                });

                run(function () {
                    controller.send('toggleFeatured');

                    expect(controller.get('model.featured')).to.be.ok;
                });
            });

            (0, _emberMocha.it)('should not save the post if it is still new', function () {
                var controller = this.subject({
                    model: _ember['default'].Object.create({
                        featured: false,
                        isNew: true,
                        save: function save() {
                            this.incrementProperty('saved');
                            return _ember['default'].RSVP.resolve();
                        }
                    })
                });

                run(function () {
                    controller.send('toggleFeatured');

                    expect(controller.get('model.featured')).to.be.ok;
                    expect(controller.get('model.saved')).to.not.be.ok;
                });
            });

            (0, _emberMocha.it)('should save the post if it is not new', function () {
                var controller = this.subject({
                    model: _ember['default'].Object.create({
                        featured: false,
                        isNew: false,
                        save: function save() {
                            this.incrementProperty('saved');
                            return _ember['default'].RSVP.resolve();
                        }
                    })
                });

                run(function () {
                    controller.send('toggleFeatured');

                    expect(controller.get('model.featured')).to.be.ok;
                    expect(controller.get('model.saved')).to.equal(1);
                });
            });
        });

        describe('generateAndSetSlug', function () {
            (0, _emberMocha.it)('should generate a slug and set it on the destination', function (done) {
                var controller = this.subject({
                    slugGenerator: _ember['default'].Object.create({
                        generateSlug: function generateSlug(slugType, str) {
                            return _ember['default'].RSVP.resolve(str + '-slug');
                        }
                    }),
                    model: _ember['default'].Object.create({ slug: '' })
                });

                run(function () {
                    controller.set('model.titleScratch', 'title');
                    controller.generateAndSetSlug('model.slug');

                    expect(controller.get('model.slug')).to.equal('');

                    _ember['default'].RSVP.resolve(controller.get('lastPromise')).then(function () {
                        expect(controller.get('model.slug')).to.equal('title-slug');

                        done();
                    })['catch'](done);
                });
            });

            (0, _emberMocha.it)('should not set the destination if the title is "(Untitled)" and the post already has a slug', function (done) {
                var controller = this.subject({
                    slugGenerator: _ember['default'].Object.create({
                        generateSlug: function generateSlug(slugType, str) {
                            return _ember['default'].RSVP.resolve(str + '-slug');
                        }
                    }),
                    model: _ember['default'].Object.create({
                        slug: 'whatever'
                    })
                });

                expect(controller.get('model.slug')).to.equal('whatever');

                run(function () {
                    controller.set('model.titleScratch', 'title');

                    _ember['default'].RSVP.resolve(controller.get('lastPromise')).then(function () {
                        expect(controller.get('model.slug')).to.equal('whatever');

                        done();
                    })['catch'](done);
                });
            });
        });

        describe('titleObserver', function () {
            (0, _emberMocha.it)('should invoke generateAndSetSlug if the post is new and a title has not been set', function (done) {
                var controller = this.subject({
                    model: _ember['default'].Object.create({ isNew: true }),
                    invoked: 0,
                    generateAndSetSlug: function generateAndSetSlug() {
                        this.incrementProperty('invoked');
                    }
                });

                expect(controller.get('invoked')).to.equal(0);
                expect(controller.get('model.title')).to.not.be.ok;

                run(function () {
                    controller.set('model.titleScratch', 'test');

                    controller.titleObserver();

                    // since titleObserver invokes generateAndSetSlug with a delay of 700ms
                    // we need to make sure this assertion runs after that.
                    // probably a better way to handle this?
                    run.later(function () {
                        expect(controller.get('invoked')).to.equal(1);

                        done();
                    }, 800);
                });
            });

            (0, _emberMocha.it)('should invoke generateAndSetSlug if the post title is "(Untitled)"', function (done) {
                var controller = this.subject({
                    model: _ember['default'].Object.create({
                        isNew: false,
                        title: '(Untitled)'
                    }),
                    invoked: 0,
                    generateAndSetSlug: function generateAndSetSlug() {
                        this.incrementProperty('invoked');
                    }
                });

                expect(controller.get('invoked')).to.equal(0);
                expect(controller.get('model.title')).to.equal('(Untitled)');

                run(function () {
                    controller.set('model.titleScratch', 'test');

                    controller.titleObserver();

                    // since titleObserver invokes generateAndSetSlug with a delay of 700ms
                    // we need to make sure this assertion runs after that.
                    // probably a better way to handle this?
                    run.later(function () {
                        expect(controller.get('invoked')).to.equal(1);

                        done();
                    }, 800);
                });
            });

            (0, _emberMocha.it)('should not invoke generateAndSetSlug if the post is new but has a title', function (done) {
                var controller = this.subject({
                    model: _ember['default'].Object.create({
                        isNew: true,
                        title: 'a title'
                    }),
                    invoked: 0,
                    generateAndSetSlug: function generateAndSetSlug() {
                        this.incrementProperty('invoked');
                    }
                });

                expect(controller.get('invoked')).to.equal(0);
                expect(controller.get('model.title')).to.equal('a title');

                run(function () {
                    controller.set('model.titleScratch', 'test');

                    controller.titleObserver();

                    // since titleObserver invokes generateAndSetSlug with a delay of 700ms
                    // we need to make sure this assertion runs after that.
                    // probably a better way to handle this?
                    run.later(function () {
                        expect(controller.get('invoked')).to.equal(0);

                        done();
                    }, 800);
                });
            });
        });

        describe('updateSlug', function () {
            (0, _emberMocha.it)('should reset slugValue to the previous slug when the new slug is blank or unchanged', function () {
                var controller = this.subject({
                    model: _ember['default'].Object.create({
                        slug: 'slug'
                    })
                });

                run(function () {
                    // unchanged
                    controller.set('slugValue', 'slug');
                    controller.send('updateSlug', controller.get('slugValue'));

                    expect(controller.get('model.slug')).to.equal('slug');
                    expect(controller.get('slugValue')).to.equal('slug');
                });

                run(function () {
                    // unchanged after trim
                    controller.set('slugValue', 'slug  ');
                    controller.send('updateSlug', controller.get('slugValue'));

                    expect(controller.get('model.slug')).to.equal('slug');
                    expect(controller.get('slugValue')).to.equal('slug');
                });

                run(function () {
                    // blank
                    controller.set('slugValue', '');
                    controller.send('updateSlug', controller.get('slugValue'));

                    expect(controller.get('model.slug')).to.equal('slug');
                    expect(controller.get('slugValue')).to.equal('slug');
                });
            });

            (0, _emberMocha.it)('should not set a new slug if the server-generated slug matches existing slug', function (done) {
                var controller = this.subject({
                    slugGenerator: _ember['default'].Object.create({
                        generateSlug: function generateSlug(slugType, str) {
                            var promise = _ember['default'].RSVP.resolve(str.split('#')[0]);
                            this.set('lastPromise', promise);
                            return promise;
                        }
                    }),
                    model: _ember['default'].Object.create({
                        slug: 'whatever'
                    })
                });

                run(function () {
                    controller.set('slugValue', 'whatever#slug');
                    controller.send('updateSlug', controller.get('slugValue'));

                    _ember['default'].RSVP.resolve(controller.get('lastPromise')).then(function () {
                        expect(controller.get('model.slug')).to.equal('whatever');

                        done();
                    })['catch'](done);
                });
            });

            (0, _emberMocha.it)('should not set a new slug if the only change is to the appended increment value', function (done) {
                var controller = this.subject({
                    slugGenerator: _ember['default'].Object.create({
                        generateSlug: function generateSlug(slugType, str) {
                            var sanitizedStr = str.replace(/[^a-zA-Z]/g, '');
                            var promise = _ember['default'].RSVP.resolve(sanitizedStr + '-2');
                            this.set('lastPromise', promise);
                            return promise;
                        }
                    }),
                    model: _ember['default'].Object.create({
                        slug: 'whatever'
                    })
                });

                run(function () {
                    controller.set('slugValue', 'whatever!');
                    controller.send('updateSlug', controller.get('slugValue'));

                    _ember['default'].RSVP.resolve(controller.get('lastPromise')).then(function () {
                        expect(controller.get('model.slug')).to.equal('whatever');

                        done();
                    })['catch'](done);
                });
            });

            (0, _emberMocha.it)('should set the slug if the new slug is different', function (done) {
                var controller = this.subject({
                    slugGenerator: _ember['default'].Object.create({
                        generateSlug: function generateSlug(slugType, str) {
                            var promise = _ember['default'].RSVP.resolve(str);
                            this.set('lastPromise', promise);
                            return promise;
                        }
                    }),
                    model: _ember['default'].Object.create({
                        slug: 'whatever',
                        save: K
                    })
                });

                run(function () {
                    controller.set('slugValue', 'changed');
                    controller.send('updateSlug', controller.get('slugValue'));

                    _ember['default'].RSVP.resolve(controller.get('lastPromise')).then(function () {
                        expect(controller.get('model.slug')).to.equal('changed');

                        done();
                    })['catch'](done);
                });
            });

            (0, _emberMocha.it)('should save the post when the slug changes and the post is not new', function (done) {
                var controller = this.subject({
                    slugGenerator: _ember['default'].Object.create({
                        generateSlug: function generateSlug(slugType, str) {
                            var promise = _ember['default'].RSVP.resolve(str);
                            this.set('lastPromise', promise);
                            return promise;
                        }
                    }),
                    model: _ember['default'].Object.create({
                        slug: 'whatever',
                        saved: 0,
                        isNew: false,
                        save: function save() {
                            this.incrementProperty('saved');
                        }
                    })
                });

                run(function () {
                    controller.set('slugValue', 'changed');
                    controller.send('updateSlug', controller.get('slugValue'));

                    _ember['default'].RSVP.resolve(controller.get('lastPromise')).then(function () {
                        expect(controller.get('model.slug')).to.equal('changed');
                        expect(controller.get('model.saved')).to.equal(1);

                        done();
                    })['catch'](done);
                });
            });

            (0, _emberMocha.it)('should not save the post when the slug changes and the post is new', function (done) {
                var controller = this.subject({
                    slugGenerator: _ember['default'].Object.create({
                        generateSlug: function generateSlug(slugType, str) {
                            var promise = _ember['default'].RSVP.resolve(str);
                            this.set('lastPromise', promise);
                            return promise;
                        }
                    }),
                    model: _ember['default'].Object.create({
                        slug: 'whatever',
                        saved: 0,
                        isNew: true,
                        save: function save() {
                            this.incrementProperty('saved');
                        }
                    })
                });

                run(function () {
                    controller.set('slugValue', 'changed');
                    controller.send('updateSlug', controller.get('slugValue'));

                    _ember['default'].RSVP.resolve(controller.get('lastPromise')).then(function () {
                        expect(controller.get('model.slug')).to.equal('changed');
                        expect(controller.get('model.saved')).to.equal(0);

                        done();
                    })['catch'](done);
                });
            });
        });
    });
});
/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
define('ghost-admin/tests/unit/controllers/settings/general-test', ['exports', 'ember', 'ember-mocha'], function (exports, _ember, _emberMocha) {
    var run = _ember['default'].run;

    (0, _emberMocha.describeModule)('controller:settings/general', 'Unit: Controller: settings/general', {
        needs: ['service:notifications']
    }, function () {
        (0, _emberMocha.it)('isDatedPermalinks should be correct', function () {
            var controller = this.subject({
                model: _ember['default'].Object.create({
                    permalinks: '/:year/:month/:day/:slug/'
                })
            });

            expect(controller.get('isDatedPermalinks')).to.be.ok;

            run(function () {
                controller.set('model.permalinks', '/:slug/');

                expect(controller.get('isDatedPermalinks')).to.not.be.ok;
            });
        });

        (0, _emberMocha.it)('setting isDatedPermalinks should switch between dated and slug', function () {
            var controller = this.subject({
                model: _ember['default'].Object.create({
                    permalinks: '/:year/:month/:day/:slug/'
                })
            });

            run(function () {
                controller.set('isDatedPermalinks', false);

                expect(controller.get('isDatedPermalinks')).to.not.be.ok;
                expect(controller.get('model.permalinks')).to.equal('/:slug/');
            });

            run(function () {
                controller.set('isDatedPermalinks', true);

                expect(controller.get('isDatedPermalinks')).to.be.ok;
                expect(controller.get('model.permalinks')).to.equal('/:year/:month/:day/:slug/');
            });
        });

        (0, _emberMocha.it)('themes should be correct', function () {
            var themes = [];
            var controller = undefined;

            themes.push({
                name: 'casper',
                active: true,
                'package': {
                    name: 'Casper',
                    version: '1.1.5'
                }
            });

            themes.push({
                name: 'rasper',
                'package': {
                    name: 'Rasper',
                    version: '1.0.0'
                }
            });

            controller = this.subject({
                model: _ember['default'].Object.create({
                    availableThemes: themes
                })
            });

            themes = controller.get('themes');
            expect(themes).to.be.an.Array;
            expect(themes.length).to.equal(2);
            expect(themes.objectAt(0).name).to.equal('casper');
            expect(themes.objectAt(0).active).to.be.ok;
            expect(themes.objectAt(0).label).to.equal('Casper - 1.1.5');
            expect(themes.objectAt(1).name).to.equal('rasper');
            expect(themes.objectAt(1).active).to.not.be.ok;
            expect(themes.objectAt(1).label).to.equal('Rasper - 1.0.0');
        });
    });
});
define('ghost-admin/tests/unit/controllers/settings/navigation-test', ['exports', 'chai', 'ember-mocha', 'ember', 'ghost-admin/models/navigation-item'], function (exports, _chai, _emberMocha, _ember, _ghostAdminModelsNavigationItem) {
    var run = _ember['default'].run;

    var navSettingJSON = '[\n    {"label":"Home","url":"/"},\n    {"label":"JS Test","url":"javascript:alert(\'hello\');"},\n    {"label":"About","url":"/about"},\n    {"label":"Sub Folder","url":"/blah/blah"},\n    {"label":"Telephone","url":"tel:01234-567890"},\n    {"label":"Mailto","url":"mailto:test@example.com"},\n    {"label":"External","url":"https://example.com/testing?query=test#anchor"},\n    {"label":"No Protocol","url":"//example.com"}\n]';

    (0, _emberMocha.describeModule)('controller:settings/navigation', 'Unit: Controller: settings/navigation', {
        // Specify the other units that are required for this test.
        needs: ['service:config', 'service:notifications', 'model:navigation-item', 'service:ajax', 'service:ghostPaths']
    }, function () {
        (0, _emberMocha.it)('blogUrl: captures config and ensures trailing slash', function () {
            var ctrl = this.subject();
            ctrl.set('config.blogUrl', 'http://localhost:2368/blog');
            (0, _chai.expect)(ctrl.get('blogUrl')).to.equal('http://localhost:2368/blog/');
        });

        (0, _emberMocha.it)('init: creates a new navigation item', function () {
            var ctrl = this.subject();

            run(function () {
                (0, _chai.expect)(ctrl.get('newNavItem')).to.exist;
                (0, _chai.expect)(ctrl.get('newNavItem.isNew')).to.be['true'];
            });
        });

        (0, _emberMocha.it)('blogUrl: captures config and ensures trailing slash', function () {
            var ctrl = this.subject();
            ctrl.set('config.blogUrl', 'http://localhost:2368/blog');
            (0, _chai.expect)(ctrl.get('blogUrl')).to.equal('http://localhost:2368/blog/');
        });

        (0, _emberMocha.it)('save: validates nav items', function (done) {
            var ctrl = this.subject();

            run(function () {
                ctrl.set('model', _ember['default'].Object.create({ navigation: [_ghostAdminModelsNavigationItem['default'].create({ label: 'First', url: '/' }), _ghostAdminModelsNavigationItem['default'].create({ label: '', url: '/second' }), _ghostAdminModelsNavigationItem['default'].create({ label: 'Third', url: '' })] }));
                // blank item won't get added because the last item is incomplete
                (0, _chai.expect)(ctrl.get('model.navigation.length')).to.equal(3);

                ctrl.save().then(function passedValidation() {
                    (0, _chai.assert)(false, 'navigationItems weren\'t validated on save');
                    done();
                })['catch'](function failedValidation() {
                    var navItems = ctrl.get('model.navigation');
                    (0, _chai.expect)(navItems[0].get('errors').toArray()).to.be.empty;
                    (0, _chai.expect)(navItems[1].get('errors.firstObject.attribute')).to.equal('label');
                    (0, _chai.expect)(navItems[2].get('errors.firstObject.attribute')).to.equal('url');
                    done();
                });
            });
        });

        (0, _emberMocha.it)('save: ignores blank last item when saving', function (done) {
            var ctrl = this.subject();

            run(function () {
                ctrl.set('model', _ember['default'].Object.create({ navigation: [_ghostAdminModelsNavigationItem['default'].create({ label: 'First', url: '/' }), _ghostAdminModelsNavigationItem['default'].create({ label: '', url: '' })] }));

                (0, _chai.expect)(ctrl.get('model.navigation.length')).to.equal(2);

                ctrl.save().then(function passedValidation() {
                    (0, _chai.assert)(false, 'navigationItems weren\'t validated on save');
                    done();
                })['catch'](function failedValidation() {
                    var navItems = ctrl.get('model.navigation');
                    (0, _chai.expect)(navItems[0].get('errors').toArray()).to.be.empty;
                    done();
                });
            });
        });

        (0, _emberMocha.it)('action - addItem: adds item to navigationItems', function () {
            var ctrl = this.subject();

            run(function () {
                ctrl.set('model', _ember['default'].Object.create({ navigation: [_ghostAdminModelsNavigationItem['default'].create({ label: 'First', url: '/first', last: true })] }));
            });

            (0, _chai.expect)(ctrl.get('model.navigation.length')).to.equal(1);

            ctrl.set('newNavItem.label', 'New');
            ctrl.set('newNavItem.url', '/new');

            run(function () {
                ctrl.send('addItem');
            });

            (0, _chai.expect)(ctrl.get('model.navigation.length')).to.equal(2);
            (0, _chai.expect)(ctrl.get('model.navigation.lastObject.label')).to.equal('New');
            (0, _chai.expect)(ctrl.get('model.navigation.lastObject.url')).to.equal('/new');
            (0, _chai.expect)(ctrl.get('model.navigation.lastObject.isNew')).to.be['false'];
            (0, _chai.expect)(ctrl.get('newNavItem.label')).to.be.blank;
            (0, _chai.expect)(ctrl.get('newNavItem.url')).to.be.blank;
            (0, _chai.expect)(ctrl.get('newNavItem.isNew')).to.be['true'];
        });

        (0, _emberMocha.it)('action - addItem: doesn\'t insert new item if last object is incomplete', function () {
            var ctrl = this.subject();

            run(function () {
                ctrl.set('model', _ember['default'].Object.create({ navigation: [_ghostAdminModelsNavigationItem['default'].create({ label: '', url: '', last: true })] }));
                (0, _chai.expect)(ctrl.get('model.navigation.length')).to.equal(1);
                ctrl.send('addItem');
                (0, _chai.expect)(ctrl.get('model.navigation.length')).to.equal(1);
            });
        });

        (0, _emberMocha.it)('action - deleteItem: removes item from navigationItems', function () {
            var ctrl = this.subject();
            var navItems = [_ghostAdminModelsNavigationItem['default'].create({ label: 'First', url: '/first' }), _ghostAdminModelsNavigationItem['default'].create({ label: 'Second', url: '/second', last: true })];

            run(function () {
                ctrl.set('model', _ember['default'].Object.create({ navigation: navItems }));
                (0, _chai.expect)(ctrl.get('model.navigation').mapBy('label')).to.deep.equal(['First', 'Second']);
                ctrl.send('deleteItem', ctrl.get('model.navigation.firstObject'));
                (0, _chai.expect)(ctrl.get('model.navigation').mapBy('label')).to.deep.equal(['Second']);
            });
        });

        (0, _emberMocha.it)('action - reorderItems: updates navigationItems list', function () {
            var ctrl = this.subject();
            var navItems = [_ghostAdminModelsNavigationItem['default'].create({ label: 'First', url: '/first' }), _ghostAdminModelsNavigationItem['default'].create({ label: 'Second', url: '/second', last: true })];

            run(function () {
                ctrl.set('model', _ember['default'].Object.create({ navigation: navItems }));
                (0, _chai.expect)(ctrl.get('model.navigation').mapBy('label')).to.deep.equal(['First', 'Second']);
                ctrl.send('reorderItems', navItems.reverseObjects());
                (0, _chai.expect)(ctrl.get('model.navigation').mapBy('label')).to.deep.equal(['Second', 'First']);
            });
        });

        (0, _emberMocha.it)('action - updateUrl: updates URL on navigationItem', function () {
            var ctrl = this.subject();
            var navItems = [_ghostAdminModelsNavigationItem['default'].create({ label: 'First', url: '/first' }), _ghostAdminModelsNavigationItem['default'].create({ label: 'Second', url: '/second', last: true })];

            run(function () {
                ctrl.set('model', _ember['default'].Object.create({ navigation: navItems }));
                (0, _chai.expect)(ctrl.get('model.navigation').mapBy('url')).to.deep.equal(['/first', '/second']);
                ctrl.send('updateUrl', '/new', ctrl.get('model.navigation.firstObject'));
                (0, _chai.expect)(ctrl.get('model.navigation').mapBy('url')).to.deep.equal(['/new', '/second']);
            });
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/controllers/subscribers-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeModule)('controller:subscribers', 'Unit: Controller: subscribers', {
        needs: ['service:notifications']
    }, function () {
        // Replace this with your real tests.
        (0, _emberMocha.it)('exists', function () {
            var controller = this.subject();
            (0, _chai.expect)(controller).to.be.ok;
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/helpers/gh-format-timeago-test', ['exports', 'chai', 'mocha', 'ghost-admin/helpers/gh-format-timeago', 'sinon'], function (exports, _chai, _mocha, _ghostAdminHelpersGhFormatTimeago, _sinon) {

    (0, _mocha.describe)('Unit: Helper: gh-format-timeago', function () {
        var mockDate = undefined;
        var utcStub = undefined;

        (0, _mocha.it)('calculates the correct time difference', function () {
            mockDate = '2016-05-30T10:00:00.000Z';
            utcStub = _sinon['default'].stub(moment, 'utc').returns('2016-05-30T11:00:00.000Z');

            var result = (0, _ghostAdminHelpersGhFormatTimeago.timeAgo)([mockDate]);
            (0, _chai.expect)(result).to.be.equal('an hour ago');

            moment.utc.restore();
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/helpers/gh-user-can-admin-test', ['exports', 'ember-mocha', 'ghost-admin/helpers/gh-user-can-admin'], function (exports, _emberMocha, _ghostAdminHelpersGhUserCanAdmin) {

    describe('Unit: Helper: gh-user-can-admin', function () {
        // Mock up roles and test for truthy
        describe('Owner role', function () {
            var user = {
                get: function get(role) {
                    if (role === 'isOwner') {
                        return true;
                    } else if (role === 'isAdmin') {
                        return false;
                    }
                }
            };

            (0, _emberMocha.it)(' - can be Admin', function () {
                var result = (0, _ghostAdminHelpersGhUserCanAdmin.ghUserCanAdmin)([user]);
                expect(result).to.equal(true);
            });
        });

        describe('Administrator role', function () {
            var user = {
                get: function get(role) {
                    if (role === 'isOwner') {
                        return false;
                    } else if (role === 'isAdmin') {
                        return true;
                    }
                }
            };

            (0, _emberMocha.it)(' - can be Admin', function () {
                var result = (0, _ghostAdminHelpersGhUserCanAdmin.ghUserCanAdmin)([user]);
                expect(result).to.equal(true);
            });
        });

        describe('Editor and Author roles', function () {
            var user = {
                get: function get(role) {
                    if (role === 'isOwner') {
                        return false;
                    } else if (role === 'isAdmin') {
                        return false;
                    }
                }
            };

            (0, _emberMocha.it)(' - cannot be Admin', function () {
                var result = (0, _ghostAdminHelpersGhUserCanAdmin.ghUserCanAdmin)([user]);
                expect(result).to.equal(false);
            });
        });
    });
});
define('ghost-admin/tests/unit/helpers/highlighted-text-test', ['exports', 'chai', 'mocha', 'ghost-admin/helpers/highlighted-text'], function (exports, _chai, _mocha, _ghostAdminHelpersHighlightedText) {

    (0, _mocha.describe)('Unit: Helper: highlighted-text', function () {

        (0, _mocha.it)('works', function () {
            var result = (0, _ghostAdminHelpersHighlightedText.highlightedText)(['Test', 'e']);
            (0, _chai.expect)(result).to.be.an('object');
            (0, _chai.expect)(result.string).to.equal('T<span class="highlight">e</span>st');
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/helpers/is-equal-test', ['exports', 'chai', 'mocha', 'ghost-admin/helpers/is-equal'], function (exports, _chai, _mocha, _ghostAdminHelpersIsEqual) {

    (0, _mocha.describe)('Unit: Helper: is-equal', function () {
        // Replace this with your real tests.
        (0, _mocha.it)('works', function () {
            var result = (0, _ghostAdminHelpersIsEqual.isEqual)([42, 42]);

            (0, _chai.expect)(result).to.be.ok;
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/helpers/is-not-test', ['exports', 'chai', 'mocha', 'ghost-admin/helpers/is-not'], function (exports, _chai, _mocha, _ghostAdminHelpersIsNot) {

    (0, _mocha.describe)('Unit: Helper: is-not', function () {
        // Replace this with your real tests.
        (0, _mocha.it)('works', function () {
            var result = (0, _ghostAdminHelpersIsNot.isNot)(false);

            (0, _chai.expect)(result).to.be.ok;
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/mixins/infinite-scroll-test', ['exports', 'chai', 'mocha', 'ember', 'ghost-admin/mixins/infinite-scroll'], function (exports, _chai, _mocha, _ember, _ghostAdminMixinsInfiniteScroll) {

    (0, _mocha.describe)('Unit: Mixin: infinite-scroll', function () {
        // Replace this with your real tests.
        (0, _mocha.it)('works', function () {
            var InfiniteScrollObject = _ember['default'].Object.extend(_ghostAdminMixinsInfiniteScroll['default']);
            var subject = InfiniteScrollObject.create();

            (0, _chai.expect)(subject).to.be.ok;
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/mixins/validation-engine-test', ['exports', 'chai', 'mocha', 'ember', 'ghost-admin/mixins/validation-engine'], function (exports, _chai, _mocha, _ember, _ghostAdminMixinsValidationEngine) {

    (0, _mocha.describe)('ValidationEngineMixin', function () {
        // Replace this with your real tests.
        // it('works', function () {
        //     var ValidationEngineObject = Ember.Object.extend(ValidationEngineMixin);
        //     var subject = ValidationEngineObject.create();
        //     expect(subject).to.be.ok;
        // });

        (0, _mocha.describe)('#validate', function () {
            (0, _mocha.it)('loads the correct validator');
            (0, _mocha.it)('rejects if the validator doesn\'t exist');
            (0, _mocha.it)('resolves with valid object');
            (0, _mocha.it)('rejects with invalid object');
            (0, _mocha.it)('clears all existing errors');

            (0, _mocha.describe)('with a specified property', function () {
                (0, _mocha.it)('resolves with valid property');
                (0, _mocha.it)('rejects with invalid property');
                (0, _mocha.it)('adds property to hasValidated array');
                (0, _mocha.it)('clears existing error on specified property');
            });

            (0, _mocha.it)('handles a passed in model');
            (0, _mocha.it)('uses this.model if available');
        });

        (0, _mocha.describe)('#save', function () {
            (0, _mocha.it)('calls validate');
            (0, _mocha.it)('rejects with validation errors');
            (0, _mocha.it)('calls object\'s #save if validation passes');
            (0, _mocha.it)('skips validation if it\'s a deletion');
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/models/navigation-item-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeModule)('model:navigation-item', 'Unit: Model: navigation-item', {
        // Specify the other units that are required for this test.
        needs: []
    }, function () {
        (0, _emberMocha.it)('isComplete is true when label and url are filled', function () {
            var model = this.subject();

            model.set('label', 'test');
            model.set('url', 'test');

            (0, _chai.expect)(model.get('isComplete')).to.be['true'];
        });

        (0, _emberMocha.it)('isComplete is false when label is blank', function () {
            var model = this.subject();

            model.set('label', '');
            model.set('url', 'test');

            (0, _chai.expect)(model.get('isComplete')).to.be['false'];
        });

        (0, _emberMocha.it)('isComplete is false when url is blank', function () {
            var model = this.subject();

            model.set('label', 'test');
            model.set('url', '');

            (0, _chai.expect)(model.get('isComplete')).to.be['false'];
        });

        (0, _emberMocha.it)('isBlank is true when label and url are blank', function () {
            var model = this.subject();

            model.set('label', '');
            model.set('url', '');

            (0, _chai.expect)(model.get('isBlank')).to.be['true'];
        });

        (0, _emberMocha.it)('isBlank is false when label is present', function () {
            var model = this.subject();

            model.set('label', 'test');
            model.set('url', '');

            (0, _chai.expect)(model.get('isBlank')).to.be['false'];
        });

        (0, _emberMocha.it)('isBlank is false when url is present', function () {
            var model = this.subject();

            model.set('label', '');
            model.set('url', 'test');

            (0, _chai.expect)(model.get('isBlank')).to.be['false'];
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/models/post-test', ['exports', 'ember', 'ember-mocha'], function (exports, _ember, _emberMocha) {

    (0, _emberMocha.describeModel)('post', 'Unit: Model: post', {
        needs: ['model:user', 'model:tag', 'model:role']
    }, function () {
        (0, _emberMocha.it)('has a validation type of "post"', function () {
            var model = this.subject();

            expect(model.validationType).to.equal('post');
        });

        (0, _emberMocha.it)('isPublished and isDraft are correct', function () {
            var model = this.subject({
                status: 'published'
            });

            expect(model.get('isPublished')).to.be.ok;
            expect(model.get('isDraft')).to.not.be.ok;

            _ember['default'].run(function () {
                model.set('status', 'draft');

                expect(model.get('isPublished')).to.not.be.ok;
                expect(model.get('isDraft')).to.be.ok;
            });
        });

        (0, _emberMocha.it)('isAuthoredByUser is correct', function () {
            /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
            var model = this.subject({
                authorId: 15
            });
            /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
            var user = _ember['default'].Object.create({ id: '15' });

            expect(model.isAuthoredByUser(user)).to.be.ok;

            _ember['default'].run(function () {
                model.set('authorId', 1);

                expect(model.isAuthoredByUser(user)).to.not.be.ok;
            });
        });

        (0, _emberMocha.it)('updateTags removes and deletes old tags', function () {
            var model = this.subject();

            _ember['default'].run(this, function () {
                var modelTags = model.get('tags');
                var tag1 = this.store().createRecord('tag', { id: '1' });
                var tag2 = this.store().createRecord('tag', { id: '2' });
                var tag3 = this.store().createRecord('tag');

                // During testing a record created without an explicit id will get
                // an id of 'fixture-n' instead of null
                tag3.set('id', null);

                modelTags.pushObject(tag1);
                modelTags.pushObject(tag2);
                modelTags.pushObject(tag3);

                expect(model.get('tags.length')).to.equal(3);

                model.updateTags();

                expect(model.get('tags.length')).to.equal(2);
                expect(model.get('tags.firstObject.id')).to.equal('1');
                expect(model.get('tags').objectAt(1).get('id')).to.equal('2');
                expect(tag1.get('isDeleted')).to.not.be.ok;
                expect(tag2.get('isDeleted')).to.not.be.ok;
                expect(tag3.get('isDeleted')).to.be.ok;
            });
        });
    });
});
define('ghost-admin/tests/unit/models/role-test', ['exports', 'ember', 'ember-mocha'], function (exports, _ember, _emberMocha) {
    var run = _ember['default'].run;

    (0, _emberMocha.describeModel)('role', 'Unit: Model: role', function () {
        (0, _emberMocha.it)('provides a lowercase version of the name', function () {
            var model = this.subject({
                name: 'Author'
            });

            expect(model.get('name')).to.equal('Author');
            expect(model.get('lowerCaseName')).to.equal('author');

            run(function () {
                model.set('name', 'Editor');

                expect(model.get('name')).to.equal('Editor');
                expect(model.get('lowerCaseName')).to.equal('editor');
            });
        });
    });
});
define('ghost-admin/tests/unit/models/setting-test', ['exports', 'ember-mocha'], function (exports, _emberMocha) {

    (0, _emberMocha.describeModel)('setting', 'Unit: Model: setting', function () {
        (0, _emberMocha.it)('has a validation type of "setting"', function () {
            var model = this.subject();

            expect(model.get('validationType')).to.equal('setting');
        });
    });
});
define('ghost-admin/tests/unit/models/subscriber-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeModel)('subscriber', 'Unit: Model: subscriber', {
        // Specify the other units that are required for this test.
        needs: ['model:post']
    }, function () {
        // Replace this with your real tests.
        (0, _emberMocha.it)('exists', function () {
            var model = this.subject();
            // var store = this.store();
            (0, _chai.expect)(model).to.be.ok;
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/models/tag-test', ['exports', 'ember-mocha'], function (exports, _emberMocha) {

    (0, _emberMocha.describeModel)('tag', 'Unit: Model: tag', function () {
        (0, _emberMocha.it)('has a validation type of "tag"', function () {
            var model = this.subject();

            expect(model.get('validationType')).to.equal('tag');
        });
    });
});
define('ghost-admin/tests/unit/models/user-test', ['exports', 'ember', 'ember-mocha'], function (exports, _ember, _emberMocha) {
    var run = _ember['default'].run;

    (0, _emberMocha.describeModel)('user', 'Unit: Model: user', {
        needs: ['model:role', 'serializer:application', 'serializer:user']
    }, function () {
        (0, _emberMocha.it)('has a validation type of "user"', function () {
            var model = this.subject();

            expect(model.get('validationType')).to.equal('user');
        });

        (0, _emberMocha.it)('active property is correct', function () {
            var model = this.subject({
                status: 'active'
            });

            expect(model.get('active')).to.be.ok;

            ['warn-1', 'warn-2', 'warn-3', 'warn-4', 'locked'].forEach(function (status) {
                run(function () {
                    model.set('status', status);
                });
                expect(model.get('status')).to.be.ok;
            });

            run(function () {
                model.set('status', 'inactive');
            });
            expect(model.get('active')).to.not.be.ok;

            run(function () {
                model.set('status', 'invited');
            });
            expect(model.get('active')).to.not.be.ok;
        });

        (0, _emberMocha.it)('invited property is correct', function () {
            var model = this.subject({
                status: 'invited'
            });

            expect(model.get('invited')).to.be.ok;

            run(function () {
                model.set('status', 'invited-pending');
            });
            expect(model.get('invited')).to.be.ok;

            run(function () {
                model.set('status', 'active');
            });
            expect(model.get('invited')).to.not.be.ok;

            run(function () {
                model.set('status', 'inactive');
            });
            expect(model.get('invited')).to.not.be.ok;
        });

        (0, _emberMocha.it)('pending property is correct', function () {
            var model = this.subject({
                status: 'invited-pending'
            });

            expect(model.get('pending')).to.be.ok;

            run(function () {
                model.set('status', 'invited');
            });
            expect(model.get('pending')).to.not.be.ok;

            run(function () {
                model.set('status', 'inactive');
            });
            expect(model.get('pending')).to.not.be.ok;
        });

        (0, _emberMocha.it)('role property is correct', function () {
            var _this = this;

            var model = this.subject();

            run(function () {
                var role = _this.store().push({ data: { id: 1, type: 'role', attributes: { name: 'Author' } } });
                model.get('roles').pushObject(role);
            });
            expect(model.get('role.name')).to.equal('Author');

            run(function () {
                var role = _this.store().push({ data: { id: 1, type: 'role', attributes: { name: 'Editor' } } });
                model.set('role', role);
            });
            expect(model.get('role.name')).to.equal('Editor');
        });

        (0, _emberMocha.it)('isAuthor property is correct', function () {
            var _this2 = this;

            var model = this.subject();

            run(function () {
                var role = _this2.store().push({ data: { id: 1, type: 'role', attributes: { name: 'Author' } } });
                model.set('role', role);
            });
            expect(model.get('isAuthor')).to.be.ok;
            expect(model.get('isEditor')).to.not.be.ok;
            expect(model.get('isAdmin')).to.not.be.ok;
            expect(model.get('isOwner')).to.not.be.ok;
        });

        (0, _emberMocha.it)('isEditor property is correct', function () {
            var _this3 = this;

            var model = this.subject();

            run(function () {
                var role = _this3.store().push({ data: { id: 1, type: 'role', attributes: { name: 'Editor' } } });
                model.set('role', role);
            });
            expect(model.get('isEditor')).to.be.ok;
            expect(model.get('isAuthor')).to.not.be.ok;
            expect(model.get('isAdmin')).to.not.be.ok;
            expect(model.get('isOwner')).to.not.be.ok;
        });

        (0, _emberMocha.it)('isAdmin property is correct', function () {
            var _this4 = this;

            var model = this.subject();

            run(function () {
                var role = _this4.store().push({ data: { id: 1, type: 'role', attributes: { name: 'Administrator' } } });
                model.set('role', role);
            });
            expect(model.get('isAdmin')).to.be.ok;
            expect(model.get('isAuthor')).to.not.be.ok;
            expect(model.get('isEditor')).to.not.be.ok;
            expect(model.get('isOwner')).to.not.be.ok;
        });

        (0, _emberMocha.it)('isOwner property is correct', function () {
            var _this5 = this;

            var model = this.subject();

            run(function () {
                var role = _this5.store().push({ data: { id: 1, type: 'role', attributes: { name: 'Owner' } } });
                model.set('role', role);
            });
            expect(model.get('isOwner')).to.be.ok;
            expect(model.get('isAuthor')).to.not.be.ok;
            expect(model.get('isAdmin')).to.not.be.ok;
            expect(model.get('isEditor')).to.not.be.ok;
        });
    });
});
define('ghost-admin/tests/unit/routes/subscribers/import-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeModule)('route:subscribers/import', 'Unit: Route: subscribers/import', {
        // Specify the other units that are required for this test.
        needs: ['service:notifications']
    }, function () {
        (0, _emberMocha.it)('exists', function () {
            var route = this.subject();
            (0, _chai.expect)(route).to.be.ok;
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/routes/subscribers/new-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeModule)('route:subscribers/new', 'Unit: Route: subscribers/new', {
        needs: ['service:notifications']
    }, function () {
        (0, _emberMocha.it)('exists', function () {
            var route = this.subject();
            (0, _chai.expect)(route).to.be.ok;
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/routes/subscribers-test', ['exports', 'chai', 'ember-mocha'], function (exports, _chai, _emberMocha) {

    (0, _emberMocha.describeModule)('route:subscribers', 'Unit: Route: subscribers', {
        needs: ['service:notifications']
    }, function () {
        (0, _emberMocha.it)('exists', function () {
            var route = this.subject();
            (0, _chai.expect)(route).to.be.ok;
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/services/config-test', ['exports', 'chai', 'ember-mocha', 'ember'], function (exports, _chai, _emberMocha, _ember) {

    (0, _emberMocha.describeModule)('service:config', 'Unit: Service: config', {
        // Specify the other units that are required for this test.
        // needs: ['service:foo']
    }, function () {
        // Replace this with your real tests.
        (0, _emberMocha.it)('exists', function () {
            var service = this.subject();
            (0, _chai.expect)(service).to.be.ok;
        });

        (0, _emberMocha.it)('correctly parses a client secret', function () {
            _ember['default'].$('<meta>').attr('name', 'env-clientSecret').attr('content', '23e435234423').appendTo('head');

            var service = this.subject();

            (0, _chai.expect)(service.get('clientSecret')).to.equal('23e435234423');
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/services/notifications-test', ['exports', 'ember', 'sinon', 'chai', 'ember-mocha', 'ember-ajax/errors'], function (exports, _ember, _sinon, _chai, _emberMocha, _emberAjaxErrors) {
    var run = _ember['default'].run;
    var get = _ember['default'].get;

    var emberA = _ember['default'].A;

    (0, _emberMocha.describeModule)('service:notifications', 'Unit: Service: notifications', {
        // Specify the other units that are required for this test.
        // needs: ['model:notification']
    }, function () {
        beforeEach(function () {
            this.subject().set('content', emberA());
            this.subject().set('delayedNotifications', emberA());
        });

        (0, _emberMocha.it)('filters alerts/notifications', function () {
            var notifications = this.subject();

            // wrapped in run-loop to enure alerts/notifications CPs are updated
            run(function () {
                notifications.showAlert('Alert');
                notifications.showNotification('Notification');
            });

            (0, _chai.expect)(notifications.get('alerts.length')).to.equal(1);
            (0, _chai.expect)(notifications.get('alerts.firstObject.message')).to.equal('Alert');

            (0, _chai.expect)(notifications.get('notifications.length')).to.equal(1);
            (0, _chai.expect)(notifications.get('notifications.firstObject.message')).to.equal('Notification');
        });

        (0, _emberMocha.it)('#handleNotification deals with DS.Notification notifications', function () {
            var notifications = this.subject();
            var notification = _ember['default'].Object.create({ message: '<h1>Test</h1>', status: 'alert' });

            notification.toJSON = function () {};

            notifications.handleNotification(notification);

            notification = notifications.get('alerts')[0];

            // alerts received from the server should be marked html safe
            (0, _chai.expect)(notification.get('message')).to.have.property('toHTML');
        });

        (0, _emberMocha.it)('#handleNotification defaults to notification if no status supplied', function () {
            var notifications = this.subject();

            notifications.handleNotification({ message: 'Test' }, false);

            (0, _chai.expect)(notifications.get('content')).to.deep.include({ message: 'Test', status: 'notification' });
        });

        (0, _emberMocha.it)('#showAlert adds POJO alerts', function () {
            var notifications = this.subject();

            run(function () {
                notifications.showAlert('Test Alert', { type: 'error' });
            });

            (0, _chai.expect)(notifications.get('alerts')).to.deep.include({ message: 'Test Alert', status: 'alert', type: 'error', key: undefined });
        });

        (0, _emberMocha.it)('#showAlert adds delayed notifications', function () {
            var notifications = this.subject();

            run(function () {
                notifications.showNotification('Test Alert', { type: 'error', delayed: true });
            });

            (0, _chai.expect)(notifications.get('delayedNotifications')).to.deep.include({ message: 'Test Alert', status: 'notification', type: 'error', key: undefined });
        });

        // in order to cater for complex keys that are suitable for i18n
        // we split on the second period and treat the resulting base as
        // the key for duplicate checking
        (0, _emberMocha.it)('#showAlert clears duplicates', function () {
            var notifications = this.subject();

            run(function () {
                notifications.showAlert('Kept');
                notifications.showAlert('Duplicate', { key: 'duplicate.key.fail' });
            });

            (0, _chai.expect)(notifications.get('alerts.length')).to.equal(2);

            run(function () {
                notifications.showAlert('Duplicate with new message', { key: 'duplicate.key.success' });
            });

            (0, _chai.expect)(notifications.get('alerts.length')).to.equal(2);
            (0, _chai.expect)(notifications.get('alerts.lastObject.message')).to.equal('Duplicate with new message');
        });

        (0, _emberMocha.it)('#showNotification adds POJO notifications', function () {
            var notifications = this.subject();

            run(function () {
                notifications.showNotification('Test Notification', { type: 'success' });
            });

            (0, _chai.expect)(notifications.get('notifications')).to.deep.include({ message: 'Test Notification', status: 'notification', type: 'success', key: undefined });
        });

        (0, _emberMocha.it)('#showNotification adds delayed notifications', function () {
            var notifications = this.subject();

            run(function () {
                notifications.showNotification('Test Notification', { delayed: true });
            });

            (0, _chai.expect)(notifications.get('delayedNotifications')).to.deep.include({ message: 'Test Notification', status: 'notification', type: undefined, key: undefined });
        });

        (0, _emberMocha.it)('#showNotification clears existing notifications', function () {
            var notifications = this.subject();

            run(function () {
                notifications.showNotification('First');
                notifications.showNotification('Second');
            });

            (0, _chai.expect)(notifications.get('notifications.length')).to.equal(1);
            (0, _chai.expect)(notifications.get('notifications')).to.deep.equal([{ message: 'Second', status: 'notification', type: undefined, key: undefined }]);
        });

        (0, _emberMocha.it)('#showNotification keeps existing notifications if doNotCloseNotifications option passed', function () {
            var notifications = this.subject();

            run(function () {
                notifications.showNotification('First');
                notifications.showNotification('Second', { doNotCloseNotifications: true });
            });

            (0, _chai.expect)(notifications.get('notifications.length')).to.equal(2);
        });

        // TODO: review whether this can be removed once it's no longer used by validations
        (0, _emberMocha.it)('#showErrors adds multiple notifications', function () {
            var notifications = this.subject();

            run(function () {
                notifications.showErrors([{ message: 'First' }, { message: 'Second' }]);
            });

            (0, _chai.expect)(notifications.get('notifications')).to.deep.equal([{ message: 'First', status: 'notification', type: 'error', key: undefined }, { message: 'Second', status: 'notification', type: 'error', key: undefined }]);
        });

        (0, _emberMocha.it)('#showAPIError adds single json response error', function () {
            var notifications = this.subject();
            var error = new _emberAjaxErrors.AjaxError('Single error');

            run(function () {
                notifications.showAPIError(error);
            });

            var notification = notifications.get('alerts.firstObject');
            (0, _chai.expect)(get(notification, 'message')).to.equal('Single error');
            (0, _chai.expect)(get(notification, 'status')).to.equal('alert');
            (0, _chai.expect)(get(notification, 'type')).to.equal('error');
            (0, _chai.expect)(get(notification, 'key')).to.equal('api-error');
        });

        // used to display validation errors returned from the server
        (0, _emberMocha.it)('#showAPIError adds multiple json response errors', function () {
            var notifications = this.subject();
            var error = new _emberAjaxErrors.AjaxError(['First error', 'Second error']);

            run(function () {
                notifications.showAPIError(error);
            });

            (0, _chai.expect)(notifications.get('notifications')).to.deep.equal([{ message: 'First error', status: 'notification', type: 'error', key: undefined }, { message: 'Second error', status: 'notification', type: 'error', key: undefined }]);
        });

        (0, _emberMocha.it)('#showAPIError displays default error text if response has no error/message', function () {
            var notifications = this.subject();
            var resp = false;

            run(function () {
                notifications.showAPIError(resp);
            });

            (0, _chai.expect)(notifications.get('content')).to.deep.equal([{ message: 'There was a problem on the server, please try again.', status: 'alert', type: 'error', key: 'api-error' }]);

            notifications.set('content', emberA());

            run(function () {
                notifications.showAPIError(resp, { defaultErrorText: 'Overridden default' });
            });
            (0, _chai.expect)(notifications.get('content')).to.deep.equal([{ message: 'Overridden default', status: 'alert', type: 'error', key: 'api-error' }]);
        });

        (0, _emberMocha.it)('#showAPIError sets correct key when passed a base key', function () {
            var notifications = this.subject();

            run(function () {
                notifications.showAPIError('Test', { key: 'test.alert' });
            });

            (0, _chai.expect)(notifications.get('alerts.firstObject.key')).to.equal('test.alert.api-error');
        });

        (0, _emberMocha.it)('#showAPIError sets correct key when not passed a key', function () {
            var notifications = this.subject();

            run(function () {
                notifications.showAPIError('Test');
            });

            (0, _chai.expect)(notifications.get('alerts.firstObject.key')).to.equal('api-error');
        });

        (0, _emberMocha.it)('#showAPIError parses errors from ember-ajax correctly', function () {
            var notifications = this.subject();
            var error = new _emberAjaxErrors.InvalidError('Test Error');

            run(function () {
                notifications.showAPIError(error);
            });

            var notification = notifications.get('alerts.firstObject');
            (0, _chai.expect)(get(notification, 'message')).to.equal('Test Error');
            (0, _chai.expect)(get(notification, 'status')).to.equal('alert');
            (0, _chai.expect)(get(notification, 'type')).to.equal('error');
            (0, _chai.expect)(get(notification, 'key')).to.equal('api-error');
        });

        (0, _emberMocha.it)('#displayDelayed moves delayed notifications into content', function () {
            var notifications = this.subject();

            run(function () {
                notifications.showNotification('First', { delayed: true });
                notifications.showNotification('Second', { delayed: true });
                notifications.showNotification('Third', { delayed: false });
                notifications.displayDelayed();
            });

            (0, _chai.expect)(notifications.get('notifications')).to.deep.equal([{ message: 'Third', status: 'notification', type: undefined, key: undefined }, { message: 'First', status: 'notification', type: undefined, key: undefined }, { message: 'Second', status: 'notification', type: undefined, key: undefined }]);
        });

        (0, _emberMocha.it)('#closeNotification removes POJO notifications', function () {
            var notification = { message: 'Close test', status: 'notification' };
            var notifications = this.subject();

            run(function () {
                notifications.handleNotification(notification);
            });

            (0, _chai.expect)(notifications.get('notifications')).to.include(notification);

            run(function () {
                notifications.closeNotification(notification);
            });

            (0, _chai.expect)(notifications.get('notifications')).to.not.include(notification);
        });

        (0, _emberMocha.it)('#closeNotification removes and deletes DS.Notification records', function () {
            var notification = _ember['default'].Object.create({ message: 'Close test', status: 'alert' });
            var notifications = this.subject();

            notification.toJSON = function () {};
            notification.deleteRecord = function () {};
            _sinon['default'].spy(notification, 'deleteRecord');
            notification.save = function () {
                return {
                    'finally': function _finally(callback) {
                        return callback(notification);
                    }
                };
            };
            _sinon['default'].spy(notification, 'save');

            run(function () {
                notifications.handleNotification(notification);
            });

            (0, _chai.expect)(notifications.get('alerts')).to.include(notification);

            run(function () {
                notifications.closeNotification(notification);
            });

            (0, _chai.expect)(notification.deleteRecord.calledOnce).to.be['true'];
            (0, _chai.expect)(notification.save.calledOnce).to.be['true'];

            (0, _chai.expect)(notifications.get('alerts')).to.not.include(notification);
        });

        (0, _emberMocha.it)('#closeNotifications only removes notifications', function () {
            var notifications = this.subject();

            run(function () {
                notifications.showAlert('First alert');
                notifications.showNotification('First notification');
                notifications.showNotification('Second notification', { doNotCloseNotifications: true });
            });

            (0, _chai.expect)(notifications.get('alerts.length'), 'alerts count').to.equal(1);
            (0, _chai.expect)(notifications.get('notifications.length'), 'notifications count').to.equal(2);

            run(function () {
                notifications.closeNotifications();
            });

            (0, _chai.expect)(notifications.get('alerts.length'), 'alerts count').to.equal(1);
            (0, _chai.expect)(notifications.get('notifications.length'), 'notifications count').to.equal(0);
        });

        (0, _emberMocha.it)('#closeNotifications only closes notifications with specified key', function () {
            var notifications = this.subject();

            run(function () {
                notifications.showAlert('First alert');
                // using handleNotification as showNotification will auto-prune
                // duplicates and keys will be removed if doNotCloseNotifications
                // is true
                notifications.handleNotification({ message: 'First notification', key: 'test.close', status: 'notification' });
                notifications.handleNotification({ message: 'Second notification', key: 'test.keep', status: 'notification' });
                notifications.handleNotification({ message: 'Third notification', key: 'test.close', status: 'notification' });
            });

            run(function () {
                notifications.closeNotifications('test.close');
            });

            (0, _chai.expect)(notifications.get('notifications.length'), 'notifications count').to.equal(1);
            (0, _chai.expect)(notifications.get('notifications.firstObject.message'), 'notification message').to.equal('Second notification');
            (0, _chai.expect)(notifications.get('alerts.length'), 'alerts count').to.equal(1);
        });

        (0, _emberMocha.it)('#clearAll removes everything without deletion', function () {
            var notifications = this.subject();
            var notificationModel = _ember['default'].Object.create({ message: 'model' });

            notificationModel.toJSON = function () {};
            notificationModel.deleteRecord = function () {};
            _sinon['default'].spy(notificationModel, 'deleteRecord');
            notificationModel.save = function () {
                return {
                    'finally': function _finally(callback) {
                        return callback(notificationModel);
                    }
                };
            };
            _sinon['default'].spy(notificationModel, 'save');

            notifications.handleNotification(notificationModel);
            notifications.handleNotification({ message: 'pojo' });

            notifications.clearAll();

            (0, _chai.expect)(notifications.get('content')).to.be.empty;
            (0, _chai.expect)(notificationModel.deleteRecord.called).to.be['false'];
            (0, _chai.expect)(notificationModel.save.called).to.be['false'];
        });

        (0, _emberMocha.it)('#closeAlerts only removes alerts', function () {
            var notifications = this.subject();

            notifications.showNotification('First notification');
            notifications.showAlert('First alert');
            notifications.showAlert('Second alert');

            run(function () {
                notifications.closeAlerts();
            });

            (0, _chai.expect)(notifications.get('alerts.length')).to.equal(0);
            (0, _chai.expect)(notifications.get('notifications.length')).to.equal(1);
        });

        (0, _emberMocha.it)('#closeAlerts closes only alerts with specified key', function () {
            var notifications = this.subject();

            notifications.showNotification('First notification');
            notifications.showAlert('First alert', { key: 'test.close' });
            notifications.showAlert('Second alert', { key: 'test.keep' });
            notifications.showAlert('Third alert', { key: 'test.close' });

            run(function () {
                notifications.closeAlerts('test.close');
            });

            (0, _chai.expect)(notifications.get('alerts.length')).to.equal(1);
            (0, _chai.expect)(notifications.get('alerts.firstObject.message')).to.equal('Second alert');
            (0, _chai.expect)(notifications.get('notifications.length')).to.equal(1);
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/transforms/facebook-url-user-test', ['exports', 'chai', 'ember-mocha', 'ember'], function (exports, _chai, _emberMocha, _ember) {

    var emberA = _ember['default'].A;

    (0, _emberMocha.describeModule)('transform:facebook-url-user', 'Unit: Transform: facebook-url-user', {
        // Specify the other units that are required for this test.
        // needs: ['transform:foo']
    }, function () {
        (0, _emberMocha.it)('deserializes facebook url', function () {
            var transform = this.subject();
            var serialized = 'testuser';
            var result = transform.deserialize(serialized);

            (0, _chai.expect)(result).to.equal('https://www.facebook.com/testuser');
        });

        (0, _emberMocha.it)('serializes url to facebook username', function () {
            var transform = this.subject();
            var deserialized = 'https://www.facebook.com/testuser';
            var result = transform.serialize(deserialized);

            (0, _chai.expect)(result).to.equal('testuser');
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/transforms/navigation-settings-test', ['exports', 'chai', 'ember-mocha', 'ember', 'ghost-admin/models/navigation-item'], function (exports, _chai, _emberMocha, _ember, _ghostAdminModelsNavigationItem) {

    var emberA = _ember['default'].A;

    (0, _emberMocha.describeModule)('transform:navigation-settings', 'Unit: Transform: navigation-settings', {
        // Specify the other units that are required for this test.
        // needs: ['transform:foo']
    }, function () {
        (0, _emberMocha.it)('deserializes navigation json', function () {
            var transform = this.subject();
            var serialized = '[{"label":"One","url":"/one"},{"label":"Two","url":"/two"}]';
            var result = transform.deserialize(serialized);

            (0, _chai.expect)(result.length).to.equal(2);
            (0, _chai.expect)(result[0]).to.be['instanceof'](_ghostAdminModelsNavigationItem['default']);
            (0, _chai.expect)(result[0].get('label')).to.equal('One');
            (0, _chai.expect)(result[0].get('url')).to.equal('/one');
            (0, _chai.expect)(result[1]).to.be['instanceof'](_ghostAdminModelsNavigationItem['default']);
            (0, _chai.expect)(result[1].get('label')).to.equal('Two');
            (0, _chai.expect)(result[1].get('url')).to.equal('/two');
        });

        (0, _emberMocha.it)('serializes array of NavigationItems', function () {
            var transform = this.subject();
            var deserialized = emberA([_ghostAdminModelsNavigationItem['default'].create({ label: 'One', url: '/one' }), _ghostAdminModelsNavigationItem['default'].create({ label: 'Two', url: '/two' })]);
            var result = transform.serialize(deserialized);

            (0, _chai.expect)(result).to.equal('[{"label":"One","url":"/one"},{"label":"Two","url":"/two"}]');
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/transforms/slack-settings-test', ['exports', 'chai', 'ember-mocha', 'ember', 'ghost-admin/models/slack-integration'], function (exports, _chai, _emberMocha, _ember, _ghostAdminModelsSlackIntegration) {

    var emberA = _ember['default'].A;

    (0, _emberMocha.describeModule)('transform:slack-settings', 'Unit: Transform: slack-settings', {
        // Specify the other units that are required for this test.
        // needs: ['transform:foo']
    }, function () {
        (0, _emberMocha.it)('deserializes settings json', function () {
            var transform = this.subject();
            var serialized = '[{"url":"http://myblog.com/blogpost1"}]';
            var result = transform.deserialize(serialized);

            (0, _chai.expect)(result.length).to.equal(1);
            (0, _chai.expect)(result[0]).to.be['instanceof'](_ghostAdminModelsSlackIntegration['default']);
            (0, _chai.expect)(result[0].get('url')).to.equal('http://myblog.com/blogpost1');
        });

        (0, _emberMocha.it)('serializes array of Slack settings', function () {
            var transform = this.subject();
            var deserialized = emberA([_ghostAdminModelsSlackIntegration['default'].create({ url: 'http://myblog.com/blogpost1' })]);
            var result = transform.serialize(deserialized);

            (0, _chai.expect)(result).to.equal('[{"url":"http://myblog.com/blogpost1"}]');
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/transforms/twitter-url-user-test', ['exports', 'chai', 'ember-mocha', 'ember'], function (exports, _chai, _emberMocha, _ember) {

    var emberA = _ember['default'].A;

    (0, _emberMocha.describeModule)('transform:twitter-url-user', 'Unit: Transform: twitter-url-user', {
        // Specify the other units that are required for this test.
        // needs: ['transform:foo']
    }, function () {
        (0, _emberMocha.it)('deserializes twitter url', function () {
            var transform = this.subject();
            var serialized = '@testuser';
            var result = transform.deserialize(serialized);

            (0, _chai.expect)(result).to.equal('https://twitter.com/testuser');
        });

        (0, _emberMocha.it)('serializes url to twitter username', function () {
            var transform = this.subject();
            var deserialized = 'https://twitter.com/testuser';
            var result = transform.serialize(deserialized);

            (0, _chai.expect)(result).to.equal('@testuser');
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/utils/date-formatting-test', ['exports', 'ghost-admin/utils/date-formatting'], function (exports, _ghostAdminUtilsDateFormatting) {

    describe('Unit: Util: date-formatting', function () {
        it('parses a string into a moment');
        it('formats a date or moment');
    });
});
define('ghost-admin/tests/unit/utils/ghost-paths-test', ['exports', 'ghost-admin/utils/ghost-paths'], function (exports, _ghostAdminUtilsGhostPaths) {

    describe('Unit: Util: ghost-paths', function () {
        describe('join', function () {
            var join = (0, _ghostAdminUtilsGhostPaths['default'])().url.join;

            it('should join two or more paths, normalizing slashes', function () {
                var path = undefined;

                path = join('/one/', '/two/');
                expect(path).to.equal('/one/two/');

                path = join('/one', '/two/');
                expect(path).to.equal('/one/two/');

                path = join('/one/', 'two/');
                expect(path).to.equal('/one/two/');

                path = join('/one/', 'two/', '/three/');
                expect(path).to.equal('/one/two/three/');

                path = join('/one/', 'two', 'three/');
                expect(path).to.equal('/one/two/three/');
            });

            it('should not change the slash at the beginning', function () {
                var path = undefined;

                path = join('one/');
                expect(path).to.equal('one/');
                path = join('one/', 'two');
                expect(path).to.equal('one/two/');
                path = join('/one/', 'two');
                expect(path).to.equal('/one/two/');
                path = join('one/', 'two', 'three');
                expect(path).to.equal('one/two/three/');
                path = join('/one/', 'two', 'three');
                expect(path).to.equal('/one/two/three/');
            });

            it('should always return a slash at the end', function () {
                var path = undefined;

                path = join();
                expect(path).to.equal('/');
                path = join('');
                expect(path).to.equal('/');
                path = join('one');
                expect(path).to.equal('one/');
                path = join('one/');
                expect(path).to.equal('one/');
                path = join('one', 'two');
                expect(path).to.equal('one/two/');
                path = join('one', 'two/');
                expect(path).to.equal('one/two/');
            });
        });
    });
});
define('ghost-admin/tests/unit/validators/nav-item-test', ['exports', 'chai', 'mocha', 'ghost-admin/validators/nav-item', 'ghost-admin/models/navigation-item'], function (exports, _chai, _mocha, _ghostAdminValidatorsNavItem, _ghostAdminModelsNavigationItem) {

    var testInvalidUrl = function testInvalidUrl(url) {
        var navItem = _ghostAdminModelsNavigationItem['default'].create({ url: url });

        _ghostAdminValidatorsNavItem['default'].check(navItem, 'url');

        (0, _chai.expect)(_ghostAdminValidatorsNavItem['default'].get('passed'), '"' + url + '" passed').to.be['false'];
        (0, _chai.expect)(navItem.get('errors').errorsFor('url')).to.deep.equal([{
            attribute: 'url',
            message: 'You must specify a valid URL or relative path'
        }]);
        (0, _chai.expect)(navItem.get('hasValidated')).to.include('url');
    };

    var testValidUrl = function testValidUrl(url) {
        var navItem = _ghostAdminModelsNavigationItem['default'].create({ url: url });

        _ghostAdminValidatorsNavItem['default'].check(navItem, 'url');

        (0, _chai.expect)(_ghostAdminValidatorsNavItem['default'].get('passed'), '"' + url + '" failed').to.be['true'];
        (0, _chai.expect)(navItem.get('hasValidated')).to.include('url');
    };

    (0, _mocha.describe)('Unit: Validator: nav-item', function () {
        (0, _mocha.it)('requires label presence', function () {
            var navItem = _ghostAdminModelsNavigationItem['default'].create();

            _ghostAdminValidatorsNavItem['default'].check(navItem, 'label');

            (0, _chai.expect)(_ghostAdminValidatorsNavItem['default'].get('passed')).to.be['false'];
            (0, _chai.expect)(navItem.get('errors').errorsFor('label')).to.deep.equal([{
                attribute: 'label',
                message: 'You must specify a label'
            }]);
            (0, _chai.expect)(navItem.get('hasValidated')).to.include('label');
        });

        (0, _mocha.it)('requires url presence', function () {
            var navItem = _ghostAdminModelsNavigationItem['default'].create();

            _ghostAdminValidatorsNavItem['default'].check(navItem, 'url');

            (0, _chai.expect)(_ghostAdminValidatorsNavItem['default'].get('passed')).to.be['false'];
            (0, _chai.expect)(navItem.get('errors').errorsFor('url')).to.deep.equal([{
                attribute: 'url',
                message: 'You must specify a URL or relative path'
            }]);
            (0, _chai.expect)(navItem.get('hasValidated')).to.include('url');
        });

        (0, _mocha.it)('fails on invalid url values', function () {
            var invalidUrls = ['test@example.com', '/has spaces', 'no-leading-slash', 'http://example.com/with spaces'];

            invalidUrls.forEach(function (url) {
                testInvalidUrl(url);
            });
        });

        (0, _mocha.it)('passes on valid url values', function () {
            var validUrls = ['http://localhost:2368', 'http://localhost:2368/some-path', 'https://localhost:2368/some-path', '//localhost:2368/some-path', 'http://localhost:2368/#test', 'http://localhost:2368/?query=test&another=example', 'http://localhost:2368/?query=test&another=example#test', 'tel:01234-567890', 'mailto:test@example.com', 'http://some:user@example.com:1234', '/relative/path'];

            validUrls.forEach(function (url) {
                testValidUrl(url);
            });
        });

        (0, _mocha.it)('validates url and label by default', function () {
            var navItem = _ghostAdminModelsNavigationItem['default'].create();

            _ghostAdminValidatorsNavItem['default'].check(navItem);

            (0, _chai.expect)(navItem.get('errors').errorsFor('label')).to.not.be.empty;
            (0, _chai.expect)(navItem.get('errors').errorsFor('url')).to.not.be.empty;
            (0, _chai.expect)(_ghostAdminValidatorsNavItem['default'].get('passed')).to.be['false'];
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/validators/slack-integration-test', ['exports', 'chai', 'mocha', 'ghost-admin/validators/slack-integration', 'ghost-admin/models/slack-integration'], function (exports, _chai, _mocha, _ghostAdminValidatorsSlackIntegration, _ghostAdminModelsSlackIntegration) {

    var testInvalidUrl = function testInvalidUrl(url) {
        var slackObject = _ghostAdminModelsSlackIntegration['default'].create({ url: url });

        _ghostAdminValidatorsSlackIntegration['default'].check(slackObject, 'url');

        (0, _chai.expect)(_ghostAdminValidatorsSlackIntegration['default'].get('passed'), '"' + url + '" passed').to.be['false'];
        (0, _chai.expect)(slackObject.get('errors').errorsFor('url')).to.deep.equal([{
            attribute: 'url',
            message: 'The URL must be in a format like https://hooks.slack.com/services/<your personal key>'
        }]);
        (0, _chai.expect)(slackObject.get('hasValidated')).to.include('url');
    };

    var testValidUrl = function testValidUrl(url) {
        var slackObject = _ghostAdminModelsSlackIntegration['default'].create({ url: url });

        _ghostAdminValidatorsSlackIntegration['default'].check(slackObject, 'url');

        (0, _chai.expect)(_ghostAdminValidatorsSlackIntegration['default'].get('passed'), '"' + url + '" failed').to.be['true'];
        (0, _chai.expect)(slackObject.get('hasValidated')).to.include('url');
    };

    (0, _mocha.describe)('Unit: Validator: slack-integration', function () {
        (0, _mocha.it)('fails on invalid url values', function () {
            var invalidUrls = ['test@example.com', '/has spaces', 'no-leading-slash', 'http://example.com/with spaces'];

            invalidUrls.forEach(function (url) {
                testInvalidUrl(url);
            });
        });

        (0, _mocha.it)('passes on valid url values', function () {
            var validUrls = ['https://hooks.slack.com/services/;alskdjf', 'https://hooks.slack.com/services/123445678', 'https://hooks.slack.com/services/some_webhook'];

            validUrls.forEach(function (url) {
                testValidUrl(url);
            });
        });

        (0, _mocha.it)('validates url by default', function () {
            var slackObject = _ghostAdminModelsSlackIntegration['default'].create();

            _ghostAdminValidatorsSlackIntegration['default'].check(slackObject);

            (0, _chai.expect)(slackObject.get('errors').errorsFor('url')).to.be.empty;
            (0, _chai.expect)(_ghostAdminValidatorsSlackIntegration['default'].get('passed')).to.be['true'];
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/validators/subscriber-test', ['exports', 'chai', 'mocha', 'ember', 'ghost-admin/mixins/validation-engine'], function (exports, _chai, _mocha, _ember, _ghostAdminMixinsValidationEngine) {
    var run = _ember['default'].run;

    var Subscriber = _ember['default'].Object.extend(_ghostAdminMixinsValidationEngine['default'], {
        validationType: 'subscriber',

        email: null
    });

    (0, _mocha.describe)('Unit: Validator: subscriber', function () {
        (0, _mocha.it)('validates email by default', function () {
            var subscriber = Subscriber.create({});
            var properties = subscriber.get('validators.subscriber.properties');

            console.log(subscriber);

            (0, _chai.expect)(properties, 'properties').to.include('email');
        });

        (0, _mocha.it)('passes with a valid email', function () {
            var subscriber = Subscriber.create({ email: 'test@example.com' });
            var passed = false;

            run(function () {
                subscriber.validate({ property: 'email' }).then(function () {
                    passed = true;
                });
            });

            (0, _chai.expect)(passed, 'passed').to.be['true'];
            (0, _chai.expect)(subscriber.get('hasValidated'), 'hasValidated').to.include('email');
        });

        (0, _mocha.it)('validates email presence', function () {
            var subscriber = Subscriber.create({});
            var passed = false;

            run(function () {
                subscriber.validate({ property: 'email' }).then(function () {
                    passed = true;
                });
            });

            var emailErrors = subscriber.get('errors').errorsFor('email').get(0);
            (0, _chai.expect)(emailErrors.attribute, 'errors.email.attribute').to.equal('email');
            (0, _chai.expect)(emailErrors.message, 'errors.email.message').to.equal('Please enter an email.');

            (0, _chai.expect)(passed, 'passed').to.be['false'];
            (0, _chai.expect)(subscriber.get('hasValidated'), 'hasValidated').to.include('email');
        });

        (0, _mocha.it)('validates email', function () {
            var subscriber = Subscriber.create({ email: 'foo' });
            var passed = false;

            run(function () {
                subscriber.validate({ property: 'email' }).then(function () {
                    passed = true;
                });
            });

            var emailErrors = subscriber.get('errors').errorsFor('email').get(0);
            (0, _chai.expect)(emailErrors.attribute, 'errors.email.attribute').to.equal('email');
            (0, _chai.expect)(emailErrors.message, 'errors.email.message').to.equal('Invalid email.');

            (0, _chai.expect)(passed, 'passed').to.be['false'];
            (0, _chai.expect)(subscriber.get('hasValidated'), 'hasValidated').to.include('email');
        });
    });
});
/* jshint expr:true */
define('ghost-admin/tests/unit/validators/tag-settings-test', ['exports', 'chai', 'mocha', 'sinon', 'ember', 'ghost-admin/mixins/validation-engine'], function (exports, _chai, _mocha, _sinon, _ember, _ghostAdminMixinsValidationEngine) {
    var run = _ember['default'].run;

    var Tag = _ember['default'].Object.extend(_ghostAdminMixinsValidationEngine['default'], {
        validationType: 'tag',

        name: null,
        description: null,
        metaTitle: null,
        metaDescription: null
    });

    // TODO: These tests have way too much duplication, consider creating test
    // helpers for validations

    // TODO: Move testing of validation-engine behaviour into validation-engine-test
    // and replace these tests with specific validator tests

    (0, _mocha.describe)('Unit: Validator: tag-settings', function () {
        (0, _mocha.it)('validates all fields by default', function () {
            var tag = Tag.create({});
            var properties = tag.get('validators.tag.properties');

            // TODO: This is checking implementation details rather than expected
            // behaviour. Replace once we have consistent behaviour (see below)
            (0, _chai.expect)(properties, 'properties').to.include('name');
            (0, _chai.expect)(properties, 'properties').to.include('slug');
            (0, _chai.expect)(properties, 'properties').to.include('description');
            (0, _chai.expect)(properties, 'properties').to.include('metaTitle');
            (0, _chai.expect)(properties, 'properties').to.include('metaDescription');

            // TODO: .validate (and  by extension .save) doesn't currently affect
            // .hasValidated - it would be good to make this consistent.
            // The following tests currently fail:
            //
            // run(() => {
            //     tag.validate();
            // });
            //
            // expect(tag.get('hasValidated'), 'hasValidated').to.include('name');
            // expect(tag.get('hasValidated'), 'hasValidated').to.include('description');
            // expect(tag.get('hasValidated'), 'hasValidated').to.include('metaTitle');
            // expect(tag.get('hasValidated'), 'hasValidated').to.include('metaDescription');
        });

        (0, _mocha.it)('passes with valid name', function () {
            // longest valid name
            var tag = Tag.create({ name: new Array(151).join('x') });
            var passed = false;

            (0, _chai.expect)(tag.get('name').length, 'name length').to.equal(150);

            run(function () {
                tag.validate({ property: 'name' }).then(function () {
                    passed = true;
                });
            });

            (0, _chai.expect)(passed, 'passed').to.be['true'];
            (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('name');
        });

        (0, _mocha.it)('validates name presence', function () {
            var tag = Tag.create();
            var passed = false;
            var nameErrors = undefined;

            // TODO: validator is currently a singleton meaning state leaks
            // between all objects that use it. Each object should either
            // get it's own validator instance or validator objects should not
            // contain state. The following currently fails:
            //
            // let validator = tag.get('validators.tag')
            // expect(validator.get('passed'), 'passed').to.be.false;

            run(function () {
                tag.validate({ property: 'name' }).then(function () {
                    passed = true;
                });
            });

            nameErrors = tag.get('errors').errorsFor('name').get(0);
            (0, _chai.expect)(nameErrors.attribute, 'errors.name.attribute').to.equal('name');
            (0, _chai.expect)(nameErrors.message, 'errors.name.message').to.equal('You must specify a name for the tag.');

            (0, _chai.expect)(passed, 'passed').to.be['false'];
            (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('name');
        });

        (0, _mocha.it)('validates names starting with a comma', function () {
            var tag = Tag.create({ name: ',test' });
            var passed = false;
            var nameErrors = undefined;

            run(function () {
                tag.validate({ property: 'name' }).then(function () {
                    passed = true;
                });
            });

            nameErrors = tag.get('errors').errorsFor('name').get(0);
            (0, _chai.expect)(nameErrors.attribute, 'errors.name.attribute').to.equal('name');
            (0, _chai.expect)(nameErrors.message, 'errors.name.message').to.equal('Tag names can\'t start with commas.');

            (0, _chai.expect)(passed, 'passed').to.be['false'];
            (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('name');
        });

        (0, _mocha.it)('validates name length', function () {
            // shortest invalid name
            var tag = Tag.create({ name: new Array(152).join('x') });
            var passed = false;
            var nameErrors = undefined;

            (0, _chai.expect)(tag.get('name').length, 'name length').to.equal(151);

            run(function () {
                tag.validate({ property: 'name' }).then(function () {
                    passed = true;
                });
            });

            nameErrors = tag.get('errors').errorsFor('name')[0];
            (0, _chai.expect)(nameErrors.attribute, 'errors.name.attribute').to.equal('name');
            (0, _chai.expect)(nameErrors.message, 'errors.name.message').to.equal('Tag names cannot be longer than 150 characters.');

            (0, _chai.expect)(passed, 'passed').to.be['false'];
            (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('name');
        });

        (0, _mocha.it)('passes with valid slug', function () {
            // longest valid slug
            var tag = Tag.create({ slug: new Array(151).join('x') });
            var passed = false;

            (0, _chai.expect)(tag.get('slug').length, 'slug length').to.equal(150);

            run(function () {
                tag.validate({ property: 'slug' }).then(function () {
                    passed = true;
                });
            });

            (0, _chai.expect)(passed, 'passed').to.be['true'];
            (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('slug');
        });

        (0, _mocha.it)('validates slug length', function () {
            // shortest invalid slug
            var tag = Tag.create({ slug: new Array(152).join('x') });
            var passed = false;
            var slugErrors = undefined;

            (0, _chai.expect)(tag.get('slug').length, 'slug length').to.equal(151);

            run(function () {
                tag.validate({ property: 'slug' }).then(function () {
                    passed = true;
                });
            });

            slugErrors = tag.get('errors').errorsFor('slug')[0];
            (0, _chai.expect)(slugErrors.attribute, 'errors.slug.attribute').to.equal('slug');
            (0, _chai.expect)(slugErrors.message, 'errors.slug.message').to.equal('URL cannot be longer than 150 characters.');

            (0, _chai.expect)(passed, 'passed').to.be['false'];
            (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('slug');
        });

        (0, _mocha.it)('passes with a valid description', function () {
            // longest valid description
            var tag = Tag.create({ description: new Array(201).join('x') });
            var passed = false;

            (0, _chai.expect)(tag.get('description').length, 'description length').to.equal(200);

            run(function () {
                tag.validate({ property: 'description' }).then(function () {
                    passed = true;
                });
            });

            (0, _chai.expect)(passed, 'passed').to.be['true'];
            (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('description');
        });

        (0, _mocha.it)('validates description length', function () {
            // shortest invalid description
            var tag = Tag.create({ description: new Array(202).join('x') });
            var passed = false;
            var errors = undefined;

            (0, _chai.expect)(tag.get('description').length, 'description length').to.equal(201);

            run(function () {
                tag.validate({ property: 'description' }).then(function () {
                    passed = true;
                });
            });

            errors = tag.get('errors').errorsFor('description')[0];
            (0, _chai.expect)(errors.attribute, 'errors.description.attribute').to.equal('description');
            (0, _chai.expect)(errors.message, 'errors.description.message').to.equal('Description cannot be longer than 200 characters.');

            // TODO: tag.errors appears to be a singleton and previous errors are
            // not cleared despite creating a new tag object
            //
            // console.log(JSON.stringify(tag.get('errors')));
            // expect(tag.get('errors.length')).to.equal(1);

            (0, _chai.expect)(passed, 'passed').to.be['false'];
            (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('description');
        });

        // TODO: we have both metaTitle and metaTitle property names on the
        // model/validator respectively - this should be standardised
        (0, _mocha.it)('passes with a valid metaTitle', function () {
            // longest valid metaTitle
            var tag = Tag.create({ metaTitle: new Array(151).join('x') });
            var passed = false;

            (0, _chai.expect)(tag.get('metaTitle').length, 'metaTitle length').to.equal(150);

            run(function () {
                tag.validate({ property: 'metaTitle' }).then(function () {
                    passed = true;
                });
            });

            (0, _chai.expect)(passed, 'passed').to.be['true'];
            (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('metaTitle');
        });

        (0, _mocha.it)('validates metaTitle length', function () {
            // shortest invalid metaTitle
            var tag = Tag.create({ metaTitle: new Array(152).join('x') });
            var passed = false;
            var errors = undefined;

            (0, _chai.expect)(tag.get('metaTitle').length, 'metaTitle length').to.equal(151);

            run(function () {
                tag.validate({ property: 'metaTitle' }).then(function () {
                    passed = true;
                });
            });

            errors = tag.get('errors').errorsFor('metaTitle')[0];
            (0, _chai.expect)(errors.attribute, 'errors.metaTitle.attribute').to.equal('metaTitle');
            (0, _chai.expect)(errors.message, 'errors.metaTitle.message').to.equal('Meta Title cannot be longer than 150 characters.');

            (0, _chai.expect)(passed, 'passed').to.be['false'];
            (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('metaTitle');
        });

        // TODO: we have both metaDescription and metaDescription property names on
        // the model/validator respectively - this should be standardised
        (0, _mocha.it)('passes with a valid metaDescription', function () {
            // longest valid description
            var tag = Tag.create({ metaDescription: new Array(201).join('x') });
            var passed = false;

            (0, _chai.expect)(tag.get('metaDescription').length, 'metaDescription length').to.equal(200);

            run(function () {
                tag.validate({ property: 'metaDescription' }).then(function () {
                    passed = true;
                });
            });

            (0, _chai.expect)(passed, 'passed').to.be['true'];
            (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('metaDescription');
        });

        (0, _mocha.it)('validates metaDescription length', function () {
            // shortest invalid metaDescription
            var tag = Tag.create({ metaDescription: new Array(202).join('x') });
            var passed = false;
            var errors = undefined;

            (0, _chai.expect)(tag.get('metaDescription').length, 'metaDescription length').to.equal(201);

            run(function () {
                tag.validate({ property: 'metaDescription' }).then(function () {
                    passed = true;
                });
            });

            errors = tag.get('errors').errorsFor('metaDescription')[0];
            (0, _chai.expect)(errors.attribute, 'errors.metaDescription.attribute').to.equal('metaDescription');
            (0, _chai.expect)(errors.message, 'errors.metaDescription.message').to.equal('Meta Description cannot be longer than 200 characters.');

            (0, _chai.expect)(passed, 'passed').to.be['false'];
            (0, _chai.expect)(tag.get('hasValidated'), 'hasValidated').to.include('metaDescription');
        });
    });
});
/* jshint expr:true */

// import validator from 'ghost-admin/validators/tag-settings';
/* jshint ignore:start */

require('ghost-admin/tests/test-helper');
EmberENV.TESTS_FILE_LOADED = true;

/* jshint ignore:end */
//# sourceMappingURL=tests.map