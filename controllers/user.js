const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const multer = require("multer");
const { hashPassword } = require("../utils/passwordUtils");
const path = require('path')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage }).fields([
  { name: "idFile", maxCount: 1 },
  { name: "bankStatement", maxCount: 1 },
]);

const submitKYC = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ message: "File upload failed", error: err });
    }

    const { fullName, address, phoneNumber, accountNumber, bankName } = req.body;
    const userId = req.user.id

    const idFile = req.files.idFile ? req.files.idFile[0].path : null;
    const bankStatement = req.files.bankStatement ? req.files.bankStatement[0].path : null;

    if (!idFile || !bankStatement) {
      return res.status(400).json({ message: "ID and bank statement files are required." });
    }

    try {
      await prisma.kYCTemp.create({
        data: {
          fullName,
          address,
          phoneNumber,
          idFile,
          bankStatement,
          accountNumber,
          bankName,
          userId: parseInt(userId),
        },
      });

      res.status(201).json({ message: "KYC submitted successfully." });
    } catch (error) {
      console.error("Error submitting KYC:", error);
      res.status(500).json({ message: "Failed to submit KYC", error });
    }
  });
};

const registerUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        status: "pending",
        creditScore: 100,
        role: 'client',
      },
    });

    res.status(201).json({
      message: "User registered successfully. Awaiting KYC approval.",
      user: {
        id: newUser.id,
        email: newUser.email,
        status: newUser.status,
        creditScore: newUser.creditScore,
      },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Failed to register user", error });
  }
};


const fetchAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany();

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users", error });
  }
};

const blockUser = async (req,res) => {
  const userId = parseInt(req.params.id);
  const user = await prisma.user.update({
    where:{
      id: userId,
    },
    data:{
      status: "blocked",
    }
  })
  res.status(200).json(user);
}

const dashboard = async (req, res) => {

  const userId = req.user.id

  try {
    
    const user = await prisma.user.findUnique({
      where:{
        id: userId
      }
    })
    if (req.user.status === 'pending') {

      const kycTemp = await prisma.kYCTemp.findUnique({
        where: {userId: userId}
      })

      if (!kycTemp) {
        return res.json({ msg: "User not verified yet", ok: false, user });
      }
       return res.json({kycTemp,user})
    }

    if (req.user.status === "blocked") {
      return res.json({msg: "User is blocked", ok: false, user})
    }
    const [offers, loans] = await Promise.all([
      prisma.offer.findMany({
        where: {
          status: "active"
        }
      }),
      prisma.borrowed.findMany({
        where:{
          userId:req.user.id
        }
      })
    ]);

    res.json({
      user,
      offers,
      loans,
      ok: true
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching the data.' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the user by ID
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        offers: true,
        borrowings: true,
        account: true,
        transactionsSent: true,
        transactionsReceived: true,
        issuedSender: true,
        issuedReceiver: true,
        resetPass: true,
        passwordStat: true,
        realBankAccounts: true,
        tempKYC: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get file paths for ID file and bank statement
    const idFilePath = user.idFile ? path.join(__dirname, '../uploads', user.idFile) : null;
    const bankStatementPath = user.bankStatement ? path.join(__dirname, '../uploads', user.bankStatement) : null;

    // Check if ID file and bank statement exist
    if (idFilePath && fs.existsSync(idFilePath)) {
      res.writeHead(200, { 'Content-Type': 'application/pdf' });
      fs.createReadStream(idFilePath).pipe(res);
    } else if (bankStatementPath && fs.existsSync(bankStatementPath)) {
      res.writeHead(200, { 'Content-Type': 'application/pdf' });
      fs.createReadStream(bankStatementPath).pipe(res);
    } else {
      // If both files don't exist, return user profile data without files
      res.json({ user });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user profile', error });
  }
};

module.exports = { fetchAllUsers, registerUser, blockUser, submitKYC, dashboard, getUserProfile };
