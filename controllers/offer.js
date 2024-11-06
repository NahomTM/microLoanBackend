const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createOffer = async (req, res) => {
  const userId = req.user.id;
  const amount = parseFloat(req.body.amount);
  const  durationToReturn = parseFloat(req.body.durationToReturn)
  const interestRate = parseFloat(req.body.interestRate)

  if (!userId || !amount || !interestRate || !durationToReturn) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const newOffer = await prisma.offer.create({
      data: {
        amount,
        interestRate,
        durationToReturn,
        status: "active",
        userId: parseInt(userId),
      },
    });

    return res.status(201).json(newOffer);
  } catch (error) {
    console.error("Error creating offer:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while creating the offer." });
  }
};
const updateOffer = async (req, res) => {
  const offerId = req.params.id;
  const { amount, interestRate, durationToReturn} = req.body;

  try {
    const existingOffer = await prisma.offer.findUnique({
      where: {
        id: parseInt(offerId),
      },
    });

    if (!existingOffer) {
      return res.status(404).json({ error: "Offer not found." });
    }

    if (existingOffer.status === "accepted") {
      res.json({msg: "Can not update a granted offer"})
    }

    const updates = {};

    if (amount !== undefined) updates.amount = amount;
    if (interestRate !== undefined) updates.interestRate = interestRate;
    if (durationToReturn !== undefined) updates.durationToReturn = durationToReturn;

    const updatedOffer = await prisma.offer.update({
      where: {
        id: parseInt(offerId),
      },
      data: updates,
    });

    return res.status(200).json(updatedOffer);
  } catch (error) {
    console.error("Error updating offer:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while updating the offer." });
  }
};
const getAllActiveOffers = async (req, res) => {
  try {
    const offers = await prisma.offer.findMany({
      where: {
        status: "active",
      },
      include: {
        user: true,
      },
    });
    return res.status(200).json(offers);
  } catch (error) {
    console.error("Error fetching offers:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while fetching the offers." });
  }
};
const getAllOffers = async (req, res) => {
  try {
    const offers = await prisma.offer.findMany({
      include: {
        user: true,
      },
    });
    return res.status(200).json(offers);
  } catch (error) {
    console.error("Error fetching offers:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while fetching the offers." });
  }
};
const deleteOffer = async (req, res) => {
  const offerId = req.params.id;

  try {
    const existingOffer = await prisma.offer.findUnique({
      where: {
        id: parseInt(offerId),
      },
    });

    if (!existingOffer) {
      return res.status(404).json({ error: "Offer not found." });
    }

    if (existingOffer.status === "accepted") {
      res.json({msg: "Can not deleted a granted offer."})
    }

    // Delete the offer from the Offer model
    await prisma.offer.delete({
      where: {
        id: parseInt(offerId),
      },
    });

    // Respond with a success message
    return res.status(200).json({ message: "Offer deleted successfully." });
  } catch (error) {
    console.error("Error deleting offer:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while deleting the offer." });
  }
};

module.exports = { createOffer, updateOffer, getAllActiveOffers, getAllOffers, deleteOffer };
