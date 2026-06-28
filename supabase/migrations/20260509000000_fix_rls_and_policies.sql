-- trip_members: auth.uid() 재평가 성능 문제 수정 (select auth.uid() 사용)
DROP POLICY IF EXISTS "로그인한 사용자 모두 접근" ON trip_members;
CREATE POLICY "trip_members_auth_access" ON trip_members
  FOR ALL
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);
