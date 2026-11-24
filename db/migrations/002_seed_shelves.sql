-- Seeds shelves 1-10 (capacity 50, the maximum allowed by FR20). Only runs while the shelf table is empty.
IF NOT EXISTS (SELECT 1 FROM dbo.shelf)
BEGIN
  SET IDENTITY_INSERT dbo.shelf ON;
  INSERT INTO dbo.shelf (id, capacity)
  VALUES (1, 50), (2, 50), (3, 50), (4, 50), (5, 50),
         (6, 50), (7, 50), (8, 50), (9, 50), (10, 50);
  SET IDENTITY_INSERT dbo.shelf OFF;
END
