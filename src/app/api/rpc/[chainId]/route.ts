const RPC_URLS: Record<string, string> = {
  "1": "https://ethereum-rpc.publicnode.com",
  "8453": "https://mainnet.base.org",
  "42161": "https://arb1.arbitrum.io/rpc",
  "10": "https://mainnet.optimism.io",
  "137": "https://polygon.drpc.org",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chainId: string }> }
) {
  const { chainId } = await params;
  const rpcUrl = RPC_URLS[chainId];

  if (!rpcUrl) {
    return Response.json({ error: "Unsupported chain" }, { status: 400 });
  }

  const body = await request.text();

  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const data = await res.text();

  return new Response(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
