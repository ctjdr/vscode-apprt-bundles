import { expect } from "chai";
import { MostRecentHotlist } from "../../../bundles/Hotlist";


suite("BundleHotlist", function () {

  test("Empty hotlist returns empty array", async function () {

    const hotlist = new MostRecentHotlist<string>(10);

    expect(hotlist.getTop(3).length).to.equal(0);
  });

  test("Latest promoted strings on top in promotion order", async function () {

    const hotlist = new MostRecentHotlist<string>(10);

    hotlist.promote("1st");
    hotlist.promote("2nd");
    hotlist.promote("3rd");
    hotlist.promote("4th");
    hotlist.promote("1st");

    expect(hotlist.getTop(3)).to.have.ordered.members(["1st", "4th", "3rd"]);
  });

  test("Negative top yields empty array", async function () {

    const hotlist = new MostRecentHotlist<string>(10);

    hotlist.promote("1st");
    hotlist.promote("2nd");
    hotlist.promote("3rd");
    hotlist.promote("4th");
    hotlist.promote("1st");

    expect(hotlist.getTop(-2)).to.eql([]);
  });

  test("No more items returned than hotlist max size", async function () {

    const hotlist = new MostRecentHotlist<string>(2);

    hotlist.promote("1st");
    hotlist.promote("2nd");
    hotlist.promote("3rd");

    expect(hotlist.getTop(3)).to.have.ordered.members(["3rd", "2nd"]);
  });
});
