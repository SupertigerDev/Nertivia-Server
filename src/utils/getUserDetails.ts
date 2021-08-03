import { getCustomStatusByUserIds, getPresenceByUserIds, getProgramActivityByUserIds } from "../newRedisWrapper";

const redis = require('../redis')
export default async function (userIDArr: string[]){

  let [result] = await getPresenceByUserIds(userIDArr);

  const memberStatusArr =  result.filter((s: string[]) => s[0] !== null && s[1] !== "0");

  // its ugly, but watever. Most of my code is ugly 🤡
  const onlineMemberUserIDArr = memberStatusArr.map((f: string[]) => f[0]);
  let [customStatusArr] = await getCustomStatusByUserIds(onlineMemberUserIDArr)
  customStatusArr = customStatusArr.filter((s: string[]) => s[0] !== null && s[1] !== null)

  let [programActivities] = await getProgramActivityByUserIds(onlineMemberUserIDArr)

  programActivities = programActivities.map((pa: any, i: number)  => {
      if (!pa) return undefined;
      const user_id = onlineMemberUserIDArr[i];
      const json = JSON.parse(pa);
      delete json.socketID;
      return {...json, user_id: user_id}
    })
    .filter((pa: any) => pa)
    return {memberStatusArr, customStatusArr, programActivityArr: programActivities};
}