import { NextResponse } from 'next/server';

export async function GET(req: Request) {
   const { searchParams } = new URL(req.url);
   const address = searchParams.get('address');

   if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
   }

   try {
      const res = await fetch(
         `https://gamma-api.polymarket.com/public-profile?address=${address}`,
         {
            headers: {
               Accept: 'application/json',
            },
            // optional but helps avoid edge caching issues
            cache: 'no-store',
         }
      );

      if (!res.ok) {
         return NextResponse.json({ exists: false }, { status: 404 });
      }

      const data = await res.json();

      return NextResponse.json({
         exists: true,
         profile: data,
      });
   } catch (err) {
      return NextResponse.json(
         { error: 'Polymarket API unreachable' },
         { status: 500 }
      );
   }
}
