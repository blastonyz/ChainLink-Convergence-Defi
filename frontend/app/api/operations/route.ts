import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";

type Side = "long" | "short";

type OperationInput = {
  side: Side;
  owner?: string;
  timestamp: number;
  price: number;
  stopPrice?: number;
  targetPrice?: number;
  sizeUsd?: number;
  txHash?: string;
  note?: string;
};

const COLLECTION = "operations";

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  try {
    const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "100");
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 500)
      : 100;

    const db = await getDb();
    const operationsRaw = await db
      .collection(COLLECTION)
      .find({})
      .sort({ timestamp: 1 })
      .limit(limit)
      .toArray();

    const operations = operationsRaw.map((operation) => ({
      ...operation,
      _id: String(operation._id),
    }));

    return NextResponse.json({
      source: "mongodb",
      count: operations.length,
      data: operations,
      requestedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected operations read error";

    return NextResponse.json(
      {
        source: "mongodb",
        error: message,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<OperationInput>;

    if (body.side !== "long" && body.side !== "short") {
      return NextResponse.json(
        { error: "Invalid side. Use 'long' or 'short'." },
        { status: 400 },
      );
    }

    const timestamp = toNumber(body.timestamp);
    const price = toNumber(body.price);
    const stopPrice = body.stopPrice == null ? undefined : toNumber(body.stopPrice);
    const targetPrice = body.targetPrice == null ? undefined : toNumber(body.targetPrice);
    const sizeUsd = body.sizeUsd == null ? undefined : toNumber(body.sizeUsd);

    if (!timestamp || timestamp <= 0) {
      return NextResponse.json({ error: "Invalid timestamp." }, { status: 400 });
    }

    if (!price || price <= 0) {
      return NextResponse.json({ error: "Invalid price." }, { status: 400 });
    }

    if (stopPrice !== undefined && (!stopPrice || stopPrice <= 0)) {
      return NextResponse.json({ error: "Invalid stopPrice." }, { status: 400 });
    }

    if (targetPrice !== undefined && (!targetPrice || targetPrice <= 0)) {
      return NextResponse.json({ error: "Invalid targetPrice." }, { status: 400 });
    }

    if (sizeUsd !== undefined && (!sizeUsd || sizeUsd <= 0)) {
      return NextResponse.json({ error: "Invalid sizeUsd." }, { status: 400 });
    }

    const operation: OperationInput & { createdAt: string } = {
      side: body.side,
      owner: body.owner?.trim() || undefined,
      timestamp,
      price,
      stopPrice,
      targetPrice,
      sizeUsd,
      txHash: body.txHash?.trim() || undefined,
      note: body.note?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const db = await getDb();
    const insertResult = await db.collection(COLLECTION).insertOne(operation);

    return NextResponse.json(
      {
        source: "mongodb",
        data: {
          ...operation,
          _id: String(insertResult.insertedId),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected operations write error";

    return NextResponse.json(
      {
        source: "mongodb",
        error: message,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid or missing id." }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });

    if (!result.deletedCount) {
      return NextResponse.json({ error: "Operation not found." }, { status: 404 });
    }

    return NextResponse.json({ source: "mongodb", deleted: true, id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected operations delete error";

    return NextResponse.json(
      {
        source: "mongodb",
        error: message,
      },
      { status: 500 },
    );
  }
}
