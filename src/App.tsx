import React, { useState } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DownloadIcon from '@mui/icons-material/Download';
import { 
  Container, 
  Typography, 
  Box, 
  TextField,
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Paper,
  Grid,
  Alert,
  TextareaAutosize,
  styled,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControlLabel, 
  Checkbox
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

// Type definitions
type Mode = 'backtesting' | 'trading';
type Contract = 'NQ' | 'ES' | 'MNQ';
type MaxMode = 'Reverse' | 'BreakThrough';

interface CsvCell {
  value: string | number;
  isNumeric: boolean;
}

interface CsvData {
  headers: string[];
  rows: CsvCell[][];
}

const StyledTextArea = styled(TextareaAutosize)({
  width: '100%',
  minHeight: '300px',
  padding: '15px',
  marginTop: '10px',
  fontFamily: '"Fira Code", "Courier New", monospace',
  fontSize: '14px',
  lineHeight: '1.5',
  borderRadius: '6px',
  border: '2px solid #e0e0e0',
  backgroundColor: '#f8f9fa',
  color: '#333',
  resize: 'vertical',
  '&:focus': {
    outline: 'none',
    borderColor: '#1976d2',
    boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.1)'
  },
  '&::placeholder': {
    color: '#999',
    fontStyle: 'italic'
  }
});

const accountNames = [
  'Account 1',
  'Account 2',
  'Account 3',
  'Demo Account'
];

const BotControlPanel: React.FC = () => {
  // ✅ All state variables properly declared inside component
  const [accountName, setAccountName] = useState('');
  const [mode, setMode] = useState<Mode>('backtesting');
  const [maxMode, setMaxMode] = useState<MaxMode>('Reverse');
  const [contract, setContract] = useState<Contract>('NQ');
  const [dateFrom, setDateFrom] = useState<Date | null>(new Date());
  const [dateTo, setDateTo] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState('');
  const [pointKey, setPointKey] = useState('15_7_5');
  const [exitStrategyKey, setExitStrategyKey] = useState('15_15');
  
  // UI state
  const [result, setResult] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{success: boolean; message: string} | null>(null);
  const [mainTabValue, setMainTabValue] = useState(0);
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  
  // File upload state
  const [useFile, setUseFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resultTabValue, setResultTabValue] = useState(0);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate form
    if (!accountName) {
      setSubmitStatus({
        success: false,
        message: 'Please select an account.'
      });
      return;
    }

    if (!useFile && (!dateFrom || !dateTo)) {
      setSubmitStatus({
        success: false,
        message: 'Please select date range or choose an input file.'
      });
      return;
    }

    if (useFile && !selectedFile) {
      setSubmitStatus({
        success: false,
        message: 'Please select an input file.'
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const formData = new FormData();
      
      if (useFile && selectedFile) {
        formData.append('file', selectedFile);
      } else if (dateFrom && dateTo) {
        formData.append('dateFrom', dateFrom.toISOString());
        formData.append('dateTo', dateTo.toISOString());
      }

      // Add other form data
      formData.append('accountName', accountName);
      formData.append('mode', mode);
      formData.append('contract', contract);
      formData.append('maxMode', maxMode);
      formData.append('point_key', pointKey);
      formData.append('exit_strategy_key', exitStrategyKey);
      if (notes) formData.append('notes', notes);

      console.log('Bot uploading...');
      const response = await fetch('http://localhost:8090/api/v1/run-bot/max', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Bot response:', result);
      
      // Format JSON result
      const jsonResult = JSON.stringify(result, null, 2);
      
      // Prepare CSV data for the table
      if (result.results && result.results.length > 0) {
        const headers = Object.keys(result.results[0]);
        const rows = result.results.map((row: any) => 
          headers.map(header => ({
            value: row[header] !== undefined ? row[header] : '',
            isNumeric: typeof row[header] === 'number'
          }))
        );
        setCsvData({
          headers,
          rows
        });
      } else {
        setCsvData(null);
      }
      
      setResult(jsonResult);

      setSubmitStatus({
        success: true,
        message: 'Bot executed successfully!'
      });
    } catch (error) {
      console.error('Error running bot:', error);
      setSubmitStatus({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Fixed file upload handler
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
    setFileName(file?.name || ''); // ✅ Now properly updates fileName
  };

  const a11yProps = (index: number) => ({
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  });

  const TabPanel = (props: {
    children?: React.ReactNode;
    index: number;
    value: number;
  }) => {
    const { children, value, index, ...other } = props;
  
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`simple-tabpanel-${index}`}
        aria-labelledby={`simple-tab-${index}`}
        {...other}
        style={{ width: '100%' }}
      >
        {value === index && (
          <Box sx={{ p: 3 }}>
            {children}
          </Box>
        )}
      </div>
    );
  };

  const handleMainTabChange = (event: React.SyntheticEvent, newTabValue: number) => {
    setMainTabValue(newTabValue);
  };
  
  const handleResultTabChange = (event: React.SyntheticEvent, newTabValue: number) => {
    setResultTabValue(newTabValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Trading Bot Control Panel
        </Typography>
        
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={mainTabValue} 
              onChange={handleMainTabChange} 
              aria-label="trading and backtesting tabs" 
              variant="fullWidth"
              sx={{ marginBottom: 2 }}
            >
              <Tab label="Trading" {...a11yProps(0)} />
              <Tab label="Backtesting" {...a11yProps(1)} />
            </Tabs>
          </Box>
          
          {/* Trading Tab */}
          <TabPanel value={mainTabValue} index={0}>
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary">
                Trading functionality coming soon...
              </Typography>
            </Box>
          </TabPanel>
          
          {/* Backtesting Tab */}
          <TabPanel value={mainTabValue} index={1}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                {/* Account Name */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth margin="normal" required>
                    <InputLabel id="account-name-label">Account Name</InputLabel>
                    <Select
                      labelId="account-name-label"
                      id="account-name"
                      value={accountName}
                      label="Account Name"
                      onChange={(e) => setAccountName(e.target.value)}
                    >
                      {accountNames.map((name) => (
                        <MenuItem key={name} value={name}>
                          {name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                {/* Contract */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth margin="normal" required>
                    <InputLabel id="contract-label">Contract</InputLabel>
                    <Select
                      labelId="contract-label"
                      id="contract"
                      value={contract}
                      label="Contract"
                      onChange={(e) => setContract(e.target.value as Contract)}
                    >
                      <MenuItem value="NQ">NQ</MenuItem>
                      <MenuItem value="ES">ES</MenuItem>
                      <MenuItem value="MNQ">MNQ</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                {/* Max Mode */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth margin="normal" required>
                    <InputLabel id="max-mode-label">Max Mode</InputLabel>
                    <Select
                      labelId="max-mode-label"
                      value={maxMode}
                      label="Max Mode"
                      onChange={(e) => setMaxMode(e.target.value as MaxMode)}
                    >
                      <MenuItem value="Reverse">Reverse</MenuItem>
                      <MenuItem value="BreakThrough">BreakThrough</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                {/* Point Key */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Point Key"
                    value={pointKey}
                    onChange={(e) => setPointKey(e.target.value)}
                    margin="normal"
                    required
                  />
                </Grid>
                
                {/* Exit Strategy Key */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Exit Strategy Key"
                    value={exitStrategyKey}
                    onChange={(e) => setExitStrategyKey(e.target.value)}
                    margin="normal"
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={useFile}
                        onChange={(e) => {
                          setUseFile(e.target.checked);
                          if (!e.target.checked) {
                            setSelectedFile(null);
                            setFileName('');
                          }
                        }}
                      />
                    }
                    label="Use input file"
                  />
                  {useFile && (
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<CloudUploadIcon />}
                      >
                        Choose File
                        <input
                          type="file"
                          hidden
                          accept=".txt,.csv"
                          onChange={handleFileChange}
                        />
                      </Button>
                      <Typography variant="body2">
                        {fileName || "No file chosen"}
                      </Typography>
                    </Box>
                  )}
                </Grid>

                {/* Date Range */}
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="Date From"
                      value={dateFrom}
                      onChange={(newValue) => setDateFrom(newValue)}
                      disabled={useFile}
                      slotProps={{ 
                        textField: { 
                          fullWidth: true, 
                          margin: 'normal', 
                          required: !useFile 
                        } 
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="Date To"
                      value={dateTo}
                      onChange={(newValue) => setDateTo(newValue)}
                      disabled={useFile}
                      slotProps={{ 
                        textField: { 
                          fullWidth: true, 
                          margin: 'normal', 
                          required: !useFile 
                        } 
                      }}
                    />
                  </Grid>
                </LocalizationProvider>
                
                {/* Notes */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes (Optional)"
                    multiline
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    margin="normal"
                  />
                </Grid>
                
                {/* Submit Button */}
                <Grid item xs={12}>
                  {submitStatus && (
                    <Alert severity={submitStatus.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                      {submitStatus.message}
                    </Alert>
                  )}
                  
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    disabled={isSubmitting}
                    startIcon={isSubmitting ? <CircularProgress size={20} /> : <PlayArrowIcon />}
                  >
                    {isSubmitting ? 'Running...' : 'Run Bot'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </TabPanel>
        </Box>
      </Paper>
      
      {/* Results Section */}
      {result && (
        <Paper elevation={3} sx={{ mt: 4, p: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs 
              value={resultTabValue} 
              onChange={handleResultTabChange} 
              aria-label="result tabs"
            >
              <Tab label="JSON" />
              <Tab label="Table" disabled={!csvData} />
            </Tabs>
          </Box>
          
          <TabPanel value={resultTabValue} index={0}>
            <StyledTextArea
              value={result}
              readOnly
              placeholder="Bot execution results will appear here..."
            />
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ContentCopyIcon />}
                onClick={() => {
                  navigator.clipboard.writeText(result);
                  setSubmitStatus({ success: true, message: 'JSON copied to clipboard!' });
                }}
              >
                Copy JSON
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => {
                  const blob = new Blob([result], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'bot-results.json';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                Download JSON
              </Button>
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={() => {
                  setResult('');
                  setCsvData(null);
                  setResultTabValue(0);
                }}
              >
                Clear Results
              </Button>
            </Box>
          </TabPanel>
          
          <TabPanel value={resultTabValue} index={1}>
            {csvData && (
              <Box sx={{ width: '100%', overflowX: 'auto' }}>
                <TableContainer component={Paper}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {csvData.headers.map((header, index) => (
                          <TableCell 
                            key={index}
                            align={csvData.rows[0]?.[index]?.isNumeric ? 'right' : 'left'}
                          >
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {csvData.rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <TableCell 
                              key={cellIndex}
                              align={cell.isNumeric ? 'right' : 'left'}
                            >
                              {cell.value}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<ContentCopyIcon />}
                    onClick={() => {
                      // Convert table data to TSV
                      const tsvData = [
                        csvData.headers.join('\t'),
                        ...csvData.rows.map(row => 
                          row.map(cell => cell.value).join('\t')
                        )
                      ].join('\n');
                      navigator.clipboard.writeText(tsvData);
                      setSubmitStatus({ success: true, message: 'Table data copied to clipboard!' });
                    }}
                  >
                    Copy Table
                  </Button>
                </Box>
              </Box>
            )}
          </TabPanel>
        </Paper>
      )}
    </Container>
  );
};

export default BotControlPanel;