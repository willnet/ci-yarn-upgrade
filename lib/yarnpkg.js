"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _spawn = require("./promise/spawn");

var _spawn2 = _interopRequireDefault(_spawn);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let COMMAND = "yarnpkg";
exports.default = class {
    constructor(workingdir, LOG) {
        this.cwd = workingdir;
        this.LOG = LOG;
    }

    install() {
        this.LOG("BEGIN yarnpkg install");
        return (0, _spawn2.default)(COMMAND, ["install"], { cwd: this.cwd }).then(() => this.LOG("END   yarnpkg install"));
    }

    outdated() {
        this.LOG("BEGIN yarnpkg outdated");
        return (0, _spawn2.default)(COMMAND, ["outdated", "--json"], { cwd: this.cwd }).then(out => {
            this.LOG("END   yarnpkg outdated");
            return out.stdout.trim();
        }).catch(out => {
            this.LOG("END   yarnpkg outdated");
            return out.stdout.trim();
        });
    }

    upgrade() {
        this.LOG("BEGIN yarnpkg upgrade");
        return (0, _spawn2.default)(COMMAND, ["upgrade", "--json"], { cwd: this.cwd }).then(out => {
            this.LOG("END   yarnpkg upgrade");
            return out.stdout.trim();
        });
    }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy95YXJucGtnLmpzIl0sIm5hbWVzIjpbIkNPTU1BTkQiLCJjb25zdHJ1Y3RvciIsIndvcmtpbmdkaXIiLCJMT0ciLCJjd2QiLCJpbnN0YWxsIiwidGhlbiIsIm91dGRhdGVkIiwib3V0Iiwic3Rkb3V0IiwidHJpbSIsImNhdGNoIiwidXBncmFkZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7Ozs7OztBQUVBLElBQUlBLFVBQVUsU0FBZDtrQkFDZSxNQUFNO0FBQ2pCQyxnQkFBWUMsVUFBWixFQUF3QkMsR0FBeEIsRUFBNkI7QUFDekIsYUFBS0MsR0FBTCxHQUFXRixVQUFYO0FBQ0EsYUFBS0MsR0FBTCxHQUFXQSxHQUFYO0FBQ0g7O0FBRURFLGNBQVU7QUFDTixhQUFLRixHQUFMLENBQVMsdUJBQVQ7QUFDQSxlQUFPLHFCQUFNSCxPQUFOLEVBQWUsQ0FBQyxTQUFELENBQWYsRUFBNEIsRUFBRUksS0FBSyxLQUFLQSxHQUFaLEVBQTVCLEVBQ0ZFLElBREUsQ0FDRyxNQUFNLEtBQUtILEdBQUwsQ0FBUyx1QkFBVCxDQURULENBQVA7QUFFSDs7QUFFREksZUFBVztBQUNQLGFBQUtKLEdBQUwsQ0FBUyx3QkFBVDtBQUNBLGVBQU8scUJBQU1ILE9BQU4sRUFBZSxDQUFDLFVBQUQsRUFBYSxRQUFiLENBQWYsRUFBdUMsRUFBRUksS0FBSyxLQUFLQSxHQUFaLEVBQXZDLEVBQ0ZFLElBREUsQ0FDR0UsT0FBTztBQUNULGlCQUFLTCxHQUFMLENBQVMsd0JBQVQ7QUFDQSxtQkFBT0ssSUFBSUMsTUFBSixDQUFXQyxJQUFYLEVBQVA7QUFDSCxTQUpFLEVBS0ZDLEtBTEUsQ0FLSUgsT0FBTztBQUNWLGlCQUFLTCxHQUFMLENBQVMsd0JBQVQ7QUFDQSxtQkFBT0ssSUFBSUMsTUFBSixDQUFXQyxJQUFYLEVBQVA7QUFDSCxTQVJFLENBQVA7QUFTSDs7QUFFREUsY0FBVTtBQUNOLGFBQUtULEdBQUwsQ0FBUyx1QkFBVDtBQUNBLGVBQU8scUJBQU1ILE9BQU4sRUFBZSxDQUFDLFNBQUQsRUFBWSxRQUFaLENBQWYsRUFBc0MsRUFBRUksS0FBSyxLQUFLQSxHQUFaLEVBQXRDLEVBQ0ZFLElBREUsQ0FDR0UsT0FBTztBQUNULGlCQUFLTCxHQUFMLENBQVMsdUJBQVQ7QUFDQSxtQkFBT0ssSUFBSUMsTUFBSixDQUFXQyxJQUFYLEVBQVA7QUFDSCxTQUpFLENBQVA7QUFLSDtBQWhDZ0IsQyIsImZpbGUiOiJ5YXJucGtnLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHNwYXduIGZyb20gXCIuL3Byb21pc2Uvc3Bhd25cIjtcblxubGV0IENPTU1BTkQgPSBcInlhcm5wa2dcIjtcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgICBjb25zdHJ1Y3Rvcih3b3JraW5nZGlyLCBMT0cpIHtcbiAgICAgICAgdGhpcy5jd2QgPSB3b3JraW5nZGlyO1xuICAgICAgICB0aGlzLkxPRyA9IExPRztcbiAgICB9XG5cbiAgICBpbnN0YWxsKCkge1xuICAgICAgICB0aGlzLkxPRyhcIkJFR0lOIHlhcm5wa2cgaW5zdGFsbFwiKTtcbiAgICAgICAgcmV0dXJuIHNwYXduKENPTU1BTkQsIFtcImluc3RhbGxcIl0sIHsgY3dkOiB0aGlzLmN3ZCB9KVxuICAgICAgICAgICAgLnRoZW4oKCkgPT4gdGhpcy5MT0coXCJFTkQgICB5YXJucGtnIGluc3RhbGxcIikpO1xuICAgIH1cblxuICAgIG91dGRhdGVkKCkge1xuICAgICAgICB0aGlzLkxPRyhcIkJFR0lOIHlhcm5wa2cgb3V0ZGF0ZWRcIik7XG4gICAgICAgIHJldHVybiBzcGF3bihDT01NQU5ELCBbXCJvdXRkYXRlZFwiLCBcIi0tanNvblwiXSwgeyBjd2Q6IHRoaXMuY3dkIH0pXG4gICAgICAgICAgICAudGhlbihvdXQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuTE9HKFwiRU5EICAgeWFybnBrZyBvdXRkYXRlZFwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3V0LnN0ZG91dC50cmltKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKG91dCA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5MT0coXCJFTkQgICB5YXJucGtnIG91dGRhdGVkXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBvdXQuc3Rkb3V0LnRyaW0oKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIHVwZ3JhZGUoKSB7XG4gICAgICAgIHRoaXMuTE9HKFwiQkVHSU4geWFybnBrZyB1cGdyYWRlXCIpO1xuICAgICAgICByZXR1cm4gc3Bhd24oQ09NTUFORCwgW1widXBncmFkZVwiLCBcIi0tanNvblwiXSwgeyBjd2Q6IHRoaXMuY3dkIH0pXG4gICAgICAgICAgICAudGhlbihvdXQgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuTE9HKFwiRU5EICAgeWFybnBrZyB1cGdyYWRlXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBvdXQuc3Rkb3V0LnRyaW0oKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cbn1cbiJdfQ==