const redis = require('../redis')
export default async function (userIDArr: String[]){

  let { ok, error, result } = await redis.getPresences(userIDArr);

  const memberStatusArr =  result.filter((s: string[]) => s[0] !== null && s[1] !== "0");

  // its ugly, but watever. Most of my code is ugly 🤡
  const onlineMemberUserIDArr = memberStatusArr.map((f: string[]) => f[0]);
  const customStatusArr = (await redis.getCustomStatusArr(onlineMemberUserIDArr)).result.filter((s: string[]) => s[0] !== null && s[1] !== null)

  const programActivityArr = (await redis.getProgramActivityArr(onlineMemberUserIDArr)).result
    .map((pa: any, i: number)  => {
      if (!pa) return undefined;
      const user_id = onlineMemberUserIDArr[i];
      const json = JSON.parse(pa);
      delete json.socketID;
      return {...json, user_id: user_id}
    })
    .filter((pa: any) => pa)
    return {memberStatusArr, customStatusArr, programActivityArr};
}