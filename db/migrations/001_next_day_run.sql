IF OBJECT_ID('dbo.next_day_run', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.next_day_run (
    processingDate date         NOT NULL PRIMARY KEY,
    ranBy          varchar(100) NOT NULL,
    ranAt          datetime2    NOT NULL DEFAULT SYSUTCDATETIME(),
    summary        nvarchar(max) NULL
  );
END
