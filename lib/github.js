"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.__test__ = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _gitUrlParse = require("git-url-parse");

var _gitUrlParse2 = _interopRequireDefault(_gitUrlParse);

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _github = require("github");

var _github2 = _interopRequireDefault(_github);

var _package = require("../package.json");

var _package2 = _interopRequireDefault(_package);

var _compare = require("./compare");

var _readPackageTree = require("./promise/read-package-tree");

var _readPackageTree2 = _interopRequireDefault(_readPackageTree);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function toTag(tags, version) {
    let v = `v${version}`;
    if (tags.has(v)) {
        return v;
    }
    return tags.has(version) && version;
}

function diffURL(cm, to) {
    if (cm.repo) {
        if (cm.current === to) {
            let tag = toTag(cm.tags, cm.current);
            return tag && `${cm.repo}/tree/${tag}`;
        }
        let ft = toTag(cm.tags, cm.current);
        let tt = toTag(cm.tags, to);
        return ft && tt && `${cm.repo}/compare/${ft}...${tt}`;
    }
    return "";
}

function versionRange(current, to) {
    if (current === to) {
        return current;
    }
    return `${current}...${to}`;
}

class CompareModel {
    constructor(a) {
        var _a = _slicedToArray(a, 5);

        this.name = _a[0];
        this.current = _a[1];
        this.wanted = _a[2];
        this.latest = _a[3];
        this.packageType = _a[4];

        this.repo = "";
        this.homepage = "";
        this.tags = new Set();
    }

    rangeWanted() {
        return versionRange(this.current, this.wanted);
    }

    rangeLatest() {
        return versionRange(this.current, this.latest);
    }

    diffWantedURL() {
        return diffURL(this, this.wanted);
    }

    diffLatestURL() {
        return diffURL(this, this.latest);
    }
}

function selectGetTagsPromise(LOG, github, c) {
    let handler = (prev, res) => {
        let tags = prev.concat(res.map(t => t.ref.split("/")[2]));
        if (github.hasNextPage(res)) {
            return github.getNextPage(res).then(r => handler(tags, r));
        }
        return tags;
    };
    if (c.repo) {
        let url = (0, _gitUrlParse2.default)(c.repo);
        if (url.owner && url.name) {
            LOG(`BEGIN getTags from ${url.toString("https")}`);
            let request = { owner: url.owner, repo: url.name };
            return Promise.all([github.gitdata.getTags(request).then(res => handler([], res))]).then(([tags]) => {
                LOG(`END   getTags ${tags}`);
                c.tags = new Set(tags);
                return c;
            }, err => {
                LOG(`END   getTags ${request} ${err}`);
                return c;
            });
        }
    }
    return Promise.resolve(c);
}

function reconcile(LOG, github, dep, c) {
    LOG(`BEGIN reconcile CompareModel ${c.name}`);
    c.homepage = dep.homepage;
    if (dep.repository) {
        if (dep.repository.url) {
            let u = (0, _gitUrlParse2.default)(dep.repository.url);
            c.repo = u && u.toString("https");
        }
        if (_lodash2.default.isString(dep.repository) && 2 === dep.split("/")) {
            c.repo = `https://github.com/${dep.repository}`;
        }
    }
    return c.shadow ? Promise.resolve(c) : selectGetTagsPromise(LOG, github, c).then(c => {
        LOG(`END   reconcile CompareModel ${c.name}`);
        return c;
    });
}

function toCompareModels(LOG, github, cwd, diff) {
    let map = new Map(diff.map(d => {
        let c = new CompareModel(d);
        return [c.name, c];
    }));
    LOG("BEGIN read-package-tree");
    return (0, _readPackageTree2.default)(cwd, (n, k) => map.get(k)).then(data => {
        LOG("END   read-package-tree");
        let ps = data.children.map(e => reconcile(LOG, github, e.package, map.get(e.package.name)));
        return Promise.all(ps).then(() => map);
    });
}

// for tesing purpose
const __test__ = exports.__test__ = [CompareModel, diffURL, toTag, versionRange];

exports.default = class {
    constructor(options, remote) {
        this.options = options;
        this.LOG = options.logger;
        this.url = (0, _gitUrlParse2.default)(remote);
        let ghopt = {
            headers: {
                "user-agent": `${_package2.default.name}/${_package2.default.version}`
            }
        };
        if (this.url.resource !== "github.com") {
            // for GHE
            ghopt.host = this.url.resource;
            ghopt.pathPrefix = "/api/v3";
        }
        this.original = new _github2.default(ghopt);
        this.original.authenticate({
            type: "token", token: options.token
        });
    }

    pullRequest(baseBranch, newBranch, diff) {
        this.LOG(`prepare PullRequest ${this.url.toString("https")} ${baseBranch}...${newBranch}`);
        if (this.options.execute) {
            this.LOG("Create Markdown Report for PullRequest.");
            return toCompareModels(this.LOG, this.original, this.options.workingdir, diff).then(_compare.toMarkdown).then(view => {
                return {
                    owner: this.url.owner,
                    repo: this.url.name,
                    base: baseBranch,
                    head: newBranch,
                    title: `update dependencies at ${this.options.now}`,
                    body: view
                };
            }).then(value => {
                this.LOG("BEGIN Send PullRequest.");
                return this.original.pullRequests.create(value).then(body => {
                    this.LOG(`END   Send PullRequest. ${body.html_url}`);
                });
            });
        } else {
            this.LOG("Sending PullRequest is skipped because --execute is not specified.");
            return toCompareModels(this.LOG, this.original, this.options.workingdir, diff).then(_compare.toTextTable);
        }
    }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9naXRodWIuanMiXSwibmFtZXMiOlsidG9UYWciLCJ0YWdzIiwidmVyc2lvbiIsInYiLCJoYXMiLCJkaWZmVVJMIiwiY20iLCJ0byIsInJlcG8iLCJjdXJyZW50IiwidGFnIiwiZnQiLCJ0dCIsInZlcnNpb25SYW5nZSIsIkNvbXBhcmVNb2RlbCIsImNvbnN0cnVjdG9yIiwiYSIsIm5hbWUiLCJ3YW50ZWQiLCJsYXRlc3QiLCJwYWNrYWdlVHlwZSIsImhvbWVwYWdlIiwiU2V0IiwicmFuZ2VXYW50ZWQiLCJyYW5nZUxhdGVzdCIsImRpZmZXYW50ZWRVUkwiLCJkaWZmTGF0ZXN0VVJMIiwic2VsZWN0R2V0VGFnc1Byb21pc2UiLCJMT0ciLCJnaXRodWIiLCJjIiwiaGFuZGxlciIsInByZXYiLCJyZXMiLCJjb25jYXQiLCJtYXAiLCJ0IiwicmVmIiwic3BsaXQiLCJoYXNOZXh0UGFnZSIsImdldE5leHRQYWdlIiwidGhlbiIsInIiLCJ1cmwiLCJvd25lciIsInRvU3RyaW5nIiwicmVxdWVzdCIsIlByb21pc2UiLCJhbGwiLCJnaXRkYXRhIiwiZ2V0VGFncyIsImVyciIsInJlc29sdmUiLCJyZWNvbmNpbGUiLCJkZXAiLCJyZXBvc2l0b3J5IiwidSIsImlzU3RyaW5nIiwic2hhZG93IiwidG9Db21wYXJlTW9kZWxzIiwiY3dkIiwiZGlmZiIsIk1hcCIsImQiLCJuIiwiayIsImdldCIsImRhdGEiLCJwcyIsImNoaWxkcmVuIiwiZSIsInBhY2thZ2UiLCJfX3Rlc3RfXyIsIm9wdGlvbnMiLCJyZW1vdGUiLCJsb2dnZXIiLCJnaG9wdCIsImhlYWRlcnMiLCJyZXNvdXJjZSIsImhvc3QiLCJwYXRoUHJlZml4Iiwib3JpZ2luYWwiLCJhdXRoZW50aWNhdGUiLCJ0eXBlIiwidG9rZW4iLCJwdWxsUmVxdWVzdCIsImJhc2VCcmFuY2giLCJuZXdCcmFuY2giLCJleGVjdXRlIiwid29ya2luZ2RpciIsInZpZXciLCJiYXNlIiwiaGVhZCIsInRpdGxlIiwibm93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QyIsImZpbGUiOiJnaXRodWIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZ2l0dXJsIGZyb20gXCJnaXQtdXJsLXBhcnNlXCI7XG5pbXBvcnQgXyBmcm9tIFwibG9kYXNoXCI7XG5cbmltcG9ydCBHaXRIdWIgZnJvbSBcImdpdGh1YlwiO1xuXG5pbXBvcnQgcGtnIGZyb20gXCIuLi9wYWNrYWdlLmpzb25cIjtcbmltcG9ydCB7IHRvTWFya2Rvd24sIHRvVGV4dFRhYmxlIH0gZnJvbSBcIi4vY29tcGFyZVwiO1xuaW1wb3J0IHJwdCBmcm9tIFwiLi9wcm9taXNlL3JlYWQtcGFja2FnZS10cmVlXCI7XG5cbmZ1bmN0aW9uIHRvVGFnKHRhZ3MsIHZlcnNpb24pIHtcbiAgICBsZXQgdiA9IGB2JHt2ZXJzaW9ufWA7XG4gICAgaWYgKHRhZ3MuaGFzKHYpKSB7XG4gICAgICAgIHJldHVybiB2O1xuICAgIH1cbiAgICByZXR1cm4gdGFncy5oYXModmVyc2lvbikgJiYgdmVyc2lvbjtcbn1cblxuZnVuY3Rpb24gZGlmZlVSTChjbSwgdG8pIHtcbiAgICBpZiAoY20ucmVwbykge1xuICAgICAgICBpZiAoY20uY3VycmVudCA9PT0gdG8pIHtcbiAgICAgICAgICAgIGxldCB0YWcgPSB0b1RhZyhjbS50YWdzLCBjbS5jdXJyZW50KTtcbiAgICAgICAgICAgIHJldHVybiB0YWcgJiYgYCR7Y20ucmVwb30vdHJlZS8ke3RhZ31gO1xuICAgICAgICB9XG4gICAgICAgIGxldCBmdCA9IHRvVGFnKGNtLnRhZ3MsIGNtLmN1cnJlbnQpO1xuICAgICAgICBsZXQgdHQgPSB0b1RhZyhjbS50YWdzLCB0byk7XG4gICAgICAgIHJldHVybiBmdCAmJiB0dCAmJiBgJHtjbS5yZXBvfS9jb21wYXJlLyR7ZnR9Li4uJHt0dH1gO1xuICAgIH1cbiAgICByZXR1cm4gXCJcIjtcbn1cblxuZnVuY3Rpb24gdmVyc2lvblJhbmdlKGN1cnJlbnQsIHRvKSB7XG4gICAgaWYgKGN1cnJlbnQgPT09IHRvKSB7XG4gICAgICAgIHJldHVybiBjdXJyZW50O1xuICAgIH1cbiAgICByZXR1cm4gYCR7Y3VycmVudH0uLi4ke3RvfWA7XG59XG5cbmNsYXNzIENvbXBhcmVNb2RlbCB7XG4gICAgY29uc3RydWN0b3IoYSkge1xuICAgICAgICBbdGhpcy5uYW1lLCB0aGlzLmN1cnJlbnQsIHRoaXMud2FudGVkLCB0aGlzLmxhdGVzdCwgdGhpcy5wYWNrYWdlVHlwZV0gPSBhO1xuICAgICAgICB0aGlzLnJlcG8gPSBcIlwiO1xuICAgICAgICB0aGlzLmhvbWVwYWdlID0gXCJcIjtcbiAgICAgICAgdGhpcy50YWdzID0gbmV3IFNldCgpO1xuICAgIH1cblxuICAgIHJhbmdlV2FudGVkKCkge1xuICAgICAgICByZXR1cm4gdmVyc2lvblJhbmdlKHRoaXMuY3VycmVudCwgdGhpcy53YW50ZWQpO1xuICAgIH1cblxuICAgIHJhbmdlTGF0ZXN0KCkge1xuICAgICAgICByZXR1cm4gdmVyc2lvblJhbmdlKHRoaXMuY3VycmVudCwgdGhpcy5sYXRlc3QpO1xuICAgIH1cblxuICAgIGRpZmZXYW50ZWRVUkwoKSB7XG4gICAgICAgIHJldHVybiBkaWZmVVJMKHRoaXMsIHRoaXMud2FudGVkKTtcbiAgICB9XG5cbiAgICBkaWZmTGF0ZXN0VVJMKCkge1xuICAgICAgICByZXR1cm4gZGlmZlVSTCh0aGlzLCB0aGlzLmxhdGVzdCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzZWxlY3RHZXRUYWdzUHJvbWlzZShMT0csIGdpdGh1YiwgYykge1xuICAgIGxldCBoYW5kbGVyID0gKHByZXYsIHJlcykgPT4ge1xuICAgICAgICBsZXQgdGFncyA9IHByZXYuY29uY2F0KHJlcy5tYXAodCA9PiB0LnJlZi5zcGxpdChcIi9cIilbMl0pKTtcbiAgICAgICAgaWYgKGdpdGh1Yi5oYXNOZXh0UGFnZShyZXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2l0aHViLmdldE5leHRQYWdlKHJlcykudGhlbihyID0+IGhhbmRsZXIodGFncywgcikpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0YWdzO1xuICAgIH07XG4gICAgaWYgKGMucmVwbykge1xuICAgICAgICBsZXQgdXJsID0gZ2l0dXJsKGMucmVwbyk7XG4gICAgICAgIGlmICh1cmwub3duZXIgJiYgdXJsLm5hbWUpIHtcbiAgICAgICAgICAgIExPRyhgQkVHSU4gZ2V0VGFncyBmcm9tICR7dXJsLnRvU3RyaW5nKFwiaHR0cHNcIil9YCk7XG4gICAgICAgICAgICBsZXQgcmVxdWVzdCA9IHsgb3duZXI6IHVybC5vd25lciwgcmVwbzogdXJsLm5hbWUgfTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICAgICAgZ2l0aHViLmdpdGRhdGEuZ2V0VGFncyhyZXF1ZXN0KVxuICAgICAgICAgICAgICAgICAgICAudGhlbihyZXMgPT4gaGFuZGxlcihbXSwgcmVzKSlcbiAgICAgICAgICAgIF0pLnRoZW4oKFt0YWdzXSkgPT4ge1xuICAgICAgICAgICAgICAgIExPRyhgRU5EICAgZ2V0VGFncyAke3RhZ3N9YCk7XG4gICAgICAgICAgICAgICAgYy50YWdzID0gbmV3IFNldCh0YWdzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYztcbiAgICAgICAgICAgIH0sIGVyciA9PiB7XG4gICAgICAgICAgICAgICAgTE9HKGBFTkQgICBnZXRUYWdzICR7cmVxdWVzdH0gJHtlcnJ9YCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGM7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGMpO1xufVxuXG5mdW5jdGlvbiByZWNvbmNpbGUoTE9HLCBnaXRodWIsIGRlcCwgYykge1xuICAgIExPRyhgQkVHSU4gcmVjb25jaWxlIENvbXBhcmVNb2RlbCAke2MubmFtZX1gKTtcbiAgICBjLmhvbWVwYWdlID0gZGVwLmhvbWVwYWdlO1xuICAgIGlmIChkZXAucmVwb3NpdG9yeSkge1xuICAgICAgICBpZiAoZGVwLnJlcG9zaXRvcnkudXJsKSB7XG4gICAgICAgICAgICBsZXQgdSA9IGdpdHVybChkZXAucmVwb3NpdG9yeS51cmwpO1xuICAgICAgICAgICAgYy5yZXBvID0gdSAmJiB1LnRvU3RyaW5nKFwiaHR0cHNcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKF8uaXNTdHJpbmcoZGVwLnJlcG9zaXRvcnkpICYmIDIgPT09IGRlcC5zcGxpdChcIi9cIikpIHtcbiAgICAgICAgICAgIGMucmVwbyA9IGBodHRwczovL2dpdGh1Yi5jb20vJHtkZXAucmVwb3NpdG9yeX1gO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjLnNoYWRvdyA/IFByb21pc2UucmVzb2x2ZShjKSA6IHNlbGVjdEdldFRhZ3NQcm9taXNlKExPRywgZ2l0aHViLCBjKS50aGVuKGMgPT4ge1xuICAgICAgICBMT0coYEVORCAgIHJlY29uY2lsZSBDb21wYXJlTW9kZWwgJHtjLm5hbWV9YCk7XG4gICAgICAgIHJldHVybiBjO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiB0b0NvbXBhcmVNb2RlbHMoTE9HLCBnaXRodWIsIGN3ZCwgZGlmZikge1xuICAgIGxldCBtYXAgPSBuZXcgTWFwKGRpZmYubWFwKGQgPT4ge1xuICAgICAgICBsZXQgYyA9IG5ldyBDb21wYXJlTW9kZWwoZCk7XG4gICAgICAgIHJldHVybiBbYy5uYW1lLCBjXTtcbiAgICB9KSk7XG4gICAgTE9HKFwiQkVHSU4gcmVhZC1wYWNrYWdlLXRyZWVcIik7XG4gICAgcmV0dXJuIHJwdChjd2QsIChuLCBrKSA9PiBtYXAuZ2V0KGspKS50aGVuKGRhdGEgPT4ge1xuICAgICAgICBMT0coXCJFTkQgICByZWFkLXBhY2thZ2UtdHJlZVwiKTtcbiAgICAgICAgbGV0IHBzID0gZGF0YS5jaGlsZHJlbi5tYXAoZSA9PiByZWNvbmNpbGUoTE9HLCBnaXRodWIsIGUucGFja2FnZSwgbWFwLmdldChlLnBhY2thZ2UubmFtZSkpKTtcbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHBzKS50aGVuKCgpID0+IG1hcCk7XG4gICAgfSk7XG59XG5cbi8vIGZvciB0ZXNpbmcgcHVycG9zZVxuZXhwb3J0IGNvbnN0IF9fdGVzdF9fID0gW0NvbXBhcmVNb2RlbCwgZGlmZlVSTCwgdG9UYWcsIHZlcnNpb25SYW5nZV07XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zLCByZW1vdGUpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICAgICAgdGhpcy5MT0cgPSBvcHRpb25zLmxvZ2dlcjtcbiAgICAgICAgdGhpcy51cmwgPSBnaXR1cmwocmVtb3RlKTtcbiAgICAgICAgbGV0IGdob3B0ID0ge1xuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgIFwidXNlci1hZ2VudFwiOiBgJHtwa2cubmFtZX0vJHtwa2cudmVyc2lvbn1gXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGlmICh0aGlzLnVybC5yZXNvdXJjZSAhPT0gXCJnaXRodWIuY29tXCIpIHtcbiAgICAgICAgICAgIC8vIGZvciBHSEVcbiAgICAgICAgICAgIGdob3B0Lmhvc3QgPSB0aGlzLnVybC5yZXNvdXJjZTtcbiAgICAgICAgICAgIGdob3B0LnBhdGhQcmVmaXggPSBcIi9hcGkvdjNcIjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9yaWdpbmFsID0gbmV3IEdpdEh1YihnaG9wdCk7XG4gICAgICAgIHRoaXMub3JpZ2luYWwuYXV0aGVudGljYXRlKHtcbiAgICAgICAgICAgIHR5cGU6IFwidG9rZW5cIiwgdG9rZW46IG9wdGlvbnMudG9rZW5cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVsbFJlcXVlc3QoYmFzZUJyYW5jaCwgbmV3QnJhbmNoLCBkaWZmKSB7XG4gICAgICAgIHRoaXMuTE9HKGBwcmVwYXJlIFB1bGxSZXF1ZXN0ICR7dGhpcy51cmwudG9TdHJpbmcoXCJodHRwc1wiKX0gJHtiYXNlQnJhbmNofS4uLiR7bmV3QnJhbmNofWApO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmV4ZWN1dGUpIHtcbiAgICAgICAgICAgIHRoaXMuTE9HKFwiQ3JlYXRlIE1hcmtkb3duIFJlcG9ydCBmb3IgUHVsbFJlcXVlc3QuXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHRvQ29tcGFyZU1vZGVscyh0aGlzLkxPRywgdGhpcy5vcmlnaW5hbCwgdGhpcy5vcHRpb25zLndvcmtpbmdkaXIsIGRpZmYpXG4gICAgICAgICAgICAgICAgLnRoZW4odG9NYXJrZG93bilcbiAgICAgICAgICAgICAgICAudGhlbih2aWV3ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG93bmVyOiB0aGlzLnVybC5vd25lcixcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcG86IHRoaXMudXJsLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBiYXNlOiBiYXNlQnJhbmNoLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGVhZDogbmV3QnJhbmNoLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IGB1cGRhdGUgZGVwZW5kZW5jaWVzIGF0ICR7dGhpcy5vcHRpb25zLm5vd31gLFxuICAgICAgICAgICAgICAgICAgICAgICAgYm9keTogdmlld1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0pLnRoZW4odmFsdWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLkxPRyhcIkJFR0lOIFNlbmQgUHVsbFJlcXVlc3QuXCIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5vcmlnaW5hbC5wdWxsUmVxdWVzdHMuY3JlYXRlKHZhbHVlKS50aGVuKGJvZHkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5MT0coYEVORCAgIFNlbmQgUHVsbFJlcXVlc3QuICR7Ym9keS5odG1sX3VybH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLkxPRyhcIlNlbmRpbmcgUHVsbFJlcXVlc3QgaXMgc2tpcHBlZCBiZWNhdXNlIC0tZXhlY3V0ZSBpcyBub3Qgc3BlY2lmaWVkLlwiKTtcbiAgICAgICAgICAgIHJldHVybiB0b0NvbXBhcmVNb2RlbHModGhpcy5MT0csIHRoaXMub3JpZ2luYWwsIHRoaXMub3B0aW9ucy53b3JraW5nZGlyLCBkaWZmKVxuICAgICAgICAgICAgICAgIC50aGVuKHRvVGV4dFRhYmxlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiJdfQ==