const redis = require('../redis')
export default async function (uniqueIDArr: String[]){

  let { ok, error, result } = await redis.getPresences(uniqueIDArr);

  const memberStatusArr =  result.filter((s: string[]) => s[0] !== null && s[1] !== "0");

  // its ugly, but watever. Most of my code is ugly 🤡
  const onlineMemberUniqueIDArr = memberStatusArr.map((f: string[]) => f[0]);
  const customStatusArr = (await redis.getCustomStatusArr(onlineMemberUniqueIDArr)).result.filter((s: string[]) => s[0] !== null && s[1] !== null)

  const programActivityArr = (await redis.getProgramActivityArr(onlineMemberUniqueIDArr)).result
    .map((pa: any, i: number)  => {
      if (!pa) return undefined;
      const uniqueID = onlineMemberUniqueIDArr[i];
      const json = JSON.parse(pa);
      delete json.socketID;
      return {...json, uniqueID}
    })
    .filter((pa: any) => pa)
    return {memberStatusArr, customStatusArr, programActivityArr};
}